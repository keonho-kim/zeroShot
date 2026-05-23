import { describe, expect, test } from "bun:test";
import {
  buildCodexLoadingLogItems as buildItems,
  codexLogSources,
  hasCodexThreadStarted as hasThreadStarted,
  type CodexLoadingLogSource,
  type CodexLoadingProgressItem
} from "@/entities/codex/codex-loading-log";
import { translateForLocale } from "@/lib/i18n";

const t = (key: Parameters<typeof translateForLocale>[1], params?: Record<string, string | number>) => translateForLocale("en", key, params);

function buildCodexLoadingLogItems(progressItems: CodexLoadingProgressItem[], rawMessages: string[]) {
  return buildItems(progressItems, codexLogSources(rawMessages), t);
}

function buildLogItems(progressItems: CodexLoadingProgressItem[], sources: CodexLoadingLogSource[]) {
  return buildItems(progressItems, sources, t);
}

function hasCodexThreadStarted(rawMessages: string[]) {
  return hasThreadStarted(codexLogSources(rawMessages));
}

describe("codex loading log model", () => {
  test("formats agent messages as user-facing chat items", () => {
    const items = buildCodexLoadingLogItems([], [
      JSON.stringify({
        type: "item.completed",
        item: {
          id: "item_1",
          type: "agent_message",
          text: "I checked the project and will create the first plan."
        }
      })
    ]);

    expect(items).toEqual([{
      id: "agent-item_1",
      kind: "agent",
      title: "Agent message",
      detail: "I checked the project and will create the first plan.",
      status: "completed",
      icon: "💬"
    }]);
  });

  test("extracts chatMessage from structured agent JSON", () => {
    const items = buildCodexLoadingLogItems([], [
      JSON.stringify({
        type: "thread.started",
        thread_id: "thread_1"
      }),
      JSON.stringify({
        type: "item.completed",
        item: {
          id: "item_1",
          type: "agent_message",
          text: JSON.stringify({
            chatMessage: "I checked the workspace and prepared the product choices.",
            decisions: []
          })
        }
      })
    ]);

    expect(items).toEqual([{
      id: "agent-thread_1-item_1",
      kind: "agent",
      title: "Agent message",
      detail: "I checked the workspace and prepared the product choices.",
      status: "completed",
      icon: "💬"
    }]);
  });

  test("removes markdown file links and local absolute paths from agent text", () => {
    const items = buildCodexLoadingLogItems([], [
      JSON.stringify({
        type: "item.completed",
        item: {
          id: "item_1",
          type: "agent_message",
          text: "Checked [README.md](/Users/khkim/test-space/zeroshot-ground-zero/README.md) before planning."
        }
      })
    ]);

    expect(items[0]?.detail).toBe("Checked README.md before planning.");
  });

  test("renders external bare URLs as markdown links", () => {
    const items = buildCodexLoadingLogItems([], [
      JSON.stringify({
        type: "item.completed",
        item: {
          id: "item_1",
          type: "agent_message",
          text: "See https://docs.cloud.google.com/translate/docs/advanced/batch-translation, FeedZero https://www.feedzero.app/"
        }
      })
    ]);

    expect(items[0]?.detail).toBe("See [docs.cloud.google.com](https://docs.cloud.google.com/translate/docs/advanced/batch-translation), [FeedZero](https://www.feedzero.app/)");
  });

  test("keeps agent messages from separate Codex threads as separate rows", () => {
    const items = buildCodexLoadingLogItems([], [
      JSON.stringify({ type: "thread.started", thread_id: "thread_a" }),
      JSON.stringify({
        type: "item.completed",
        item: { id: "item_0", type: "agent_message", text: "Reviewing the product brief." }
      }),
      JSON.stringify({ type: "thread.started", thread_id: "thread_b" }),
      JSON.stringify({
        type: "item.completed",
        item: { id: "item_0", type: "agent_message", text: "Checking the workspace context." }
      })
    ]);

    expect(items.map((item) => [item.id, item.detail])).toEqual([
      ["agent-thread_a-item_0", "Reviewing the product brief."],
      ["agent-thread_b-item_0", "Checking the workspace context."]
    ]);
  });

  test("keeps every incoming user-facing event without a fixed cap", () => {
    const messages = Array.from({ length: 120 }, (_, index) => JSON.stringify({
      type: "item.completed",
      item: {
        id: `item_${index}`,
        type: "agent_message",
        text: `Work note ${index + 1}`
      }
    }));

    const items = buildCodexLoadingLogItems([], messages);

    expect(items).toHaveLength(120);
    expect(items[0]?.detail).toBe("Work note 1");
    expect(items.at(-1)?.detail).toBe("Work note 120");
  });

  test("uses a friendly title for unknown raw text", () => {
    const items = buildCodexLoadingLogItems([], [
      "plain log output"
    ]);

    expect(items[0]?.title).toBe("Work event");
    expect(items[0]?.title).not.toMatch(/^raw /);
  });

  test("localizes stable OMAKASE messages through the common mapper", () => {
    const items = buildItems([], [{
      source: "omakase",
      stage: "architect",
      message: "Codex selected the recommended architecture choices."
    }], (key, params) => translateForLocale("ko", key, params));

    expect(items).toEqual([{
      id: "omakase-architect-0",
      kind: "agent",
      title: "에이전트 메시지",
      detail: "Codex가 추천 아키텍처 선택지를 적용했습니다.",
      status: "running",
      icon: "💬"
    }]);
  });

  test("formats tool calls with an icon, tool name, and detail", () => {
    const items = buildCodexLoadingLogItems([], [
      JSON.stringify({
        type: "item.updated",
        item: {
          id: "item_2",
          type: "mcp_tool_call",
          server: "github",
          tool: "get_pull_request",
          input: "repo=zeroShot pr=13"
        }
      })
    ]);

    expect(items).toEqual([{
      id: "tool-item_2",
      kind: "tool",
      title: "github.get_pull_request",
      detail: "",
      status: "running",
      icon: "🛠️"
    }]);
  });

  test("shows only a site for opened web pages", () => {
    const items = buildCodexLoadingLogItems([], [
      JSON.stringify({
        type: "item.completed",
        item: {
          id: "web_1",
          type: "web_search",
          action: {
            type: "open_page",
            url: "https://www.example.com/docs/codex"
          }
        }
      }),
      JSON.stringify({
        type: "item.completed",
        item: {
          id: "web_2",
          type: "web_search",
          query: "codex sdk events"
        }
      })
    ]);

    expect(items.map((item) => [item.title, item.detail])).toEqual([
      ["Read web page", "example.com"],
      ["Web search", ""]
    ]);
  });

  test("formats reasoning as a subdued user-facing item", () => {
    const items = buildCodexLoadingLogItems([], [
      JSON.stringify({
        type: "item.updated",
        item: {
          id: "reasoning_1",
          type: "reasoning",
          text: "Reviewing the product brief and the next implementation choice."
        }
      })
    ]);

    expect(items).toEqual([{
      id: "reasoning-reasoning_1",
      kind: "reasoning",
      title: "Reasoning",
      detail: "Reviewing the product brief and the next implementation choice.",
      status: "running",
      icon: "💭"
    }]);
  });

  test("updates the same item instead of appending duplicate status rows", () => {
    const items = buildCodexLoadingLogItems([], [
      JSON.stringify({
        type: "item.updated",
        item: { id: "cmd_1", type: "command_execution", command: "bun test", status: "in_progress" }
      }),
      JSON.stringify({
        type: "item.completed",
        item: { id: "cmd_1", type: "command_execution", command: "bun test", status: "completed" }
      })
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "tool-cmd_1",
      status: "completed",
      detail: ""
    });
  });

  test("orders progress and raw Codex items by raw event sequence", () => {
    const items = buildCodexLoadingLogItems([
      {
        id: "session",
        title: "Product analysis started",
        detail: "The brief entered the planning flow.",
        status: "completed"
      },
      {
        id: "analysis",
        title: "Analyzing requirements",
        detail: "Separating the core requirements.",
        status: "running"
      },
      {
        id: "validation",
        title: "Product direction reviewed",
        detail: "Prepared the product direction options.",
        status: "completed"
      }
    ], [
      JSON.stringify({ type: "thread.started" }),
      JSON.stringify({ type: "turn.started" }),
      JSON.stringify({
        type: "item.completed",
        item: {
          id: "item_1",
          type: "agent_message",
          text: "I checked the project and will create the first plan."
        }
      }),
      JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1, reasoning_output_tokens: 0 } })
    ]);

    expect(items.map((item) => item.id)).toEqual([
      "progress-session",
      "progress-analysis",
      "agent-thread-0-item_1",
      "progress-validation"
    ]);
    expect(items.at(-1)?.detail).toBe("Prepared the product direction options.");
  });

  test("maps common shell commands to friendlier tool names", () => {
    const items = buildCodexLoadingLogItems([], [
      JSON.stringify({
        type: "item.updated",
        item: {
          id: "item_3",
          type: "command_execution",
          command: "rg -n \"ThreadEvent\" src"
        }
      }),
      JSON.stringify({
        type: "item.updated",
        item: {
          id: "item_4",
          type: "command_execution",
          command: "ls src/ui"
        }
      }),
      JSON.stringify({
        type: "item.updated",
        item: {
          id: "item_5",
          type: "command_execution",
          command: "/bin/zsh -lc 'rg --files'"
        }
      }),
      JSON.stringify({
        type: "item.updated",
        item: {
          id: "item_6",
          type: "command_execution",
          command: "/bin/zsh -lc ls"
        }
      })
    ]);

    expect(items.map((item) => [item.icon, item.title])).toEqual([
      ["🔎", "Search files"],
      ["📁", "Browse files"],
      ["🔎", "Search files"],
      ["📁", "Browse files"]
    ]);
    expect(items.every((item) => item.detail === "")).toBe(true);
  });

  test("maps progress search, tool, file, agent, and reasoning items to matching renderer kinds", () => {
    const items = buildItems([
      { id: "architect:search-rss", title: "ARCHITECT · Searching", detail: "RSS reader", status: "running" },
      { id: "architect:tool-github", title: "ARCHITECT · Tool call", detail: "github.search", status: "completed" },
      { id: "architect:file-change", title: "ARCHITECT · File changes", detail: "updated: README.md", status: "completed" },
      { id: "architect:agent-message", title: "ARCHITECT · Writing response", detail: "Preparing answer.", status: "running" },
      { id: "architect:reasoning-current", title: "ARCHITECT · Reviewing", detail: "Checking tradeoffs.", status: "running" }
    ], [], t);

    expect(items.map((item) => [item.kind, item.icon, item.title])).toEqual([
      ["tool", "🌐", "ARCHITECT · Searching"],
      ["tool", "🛠️", "ARCHITECT · Tool call"],
      ["tool", "📝", "ARCHITECT · File changes"],
      ["agent", "💬", "ARCHITECT · Writing response"],
      ["reasoning", "💭", "ARCHITECT · Reviewing"]
    ]);
  });

  test("maps progress command items to existing CLI icons", () => {
    const items = buildItems([
      { id: "architect:command-rg", title: "ARCHITECT · Command execution", detail: "completed: /bin/zsh -lc 'rg --files'", status: "completed" },
      { id: "build:command-ls", title: "BUILD · Command execution", detail: "in_progress: ls src/ui", status: "running" },
      { id: "build:command-git", title: "BUILD · Command execution", detail: "completed: git status --short", status: "completed" },
      { id: "build:command-bun", title: "BUILD · Command execution", detail: "completed: bun test", status: "completed" }
    ], [], t);

    expect(items.map((item) => [item.kind, item.icon])).toEqual([
      ["tool", "🔎"],
      ["tool", "📁"],
      ["tool", "🌿"],
      ["tool", "📦"]
    ]);
  });

  test("maps manual job Codex log lines through the common tool renderer", () => {
    const items = buildLogItems([], [
      { source: "job", lineType: "stdout", text: "item updated: web_search RSS reader apps" },
      { source: "job", lineType: "stdout", text: "item completed: agent_message" }
    ]);

    expect(items).toEqual([
      {
        id: "job-web-0",
        kind: "tool",
        title: "Web search",
        detail: "RSS reader apps",
        icon: "🌐"
      },
      {
        id: "job-agent-1",
        kind: "agent",
        title: "Agent message",
        detail: "Codex is writing the response and work status.",
        icon: "💬"
      }
    ]);
  });

  test("detects when a Codex thread has started", () => {
    const items = [
      JSON.stringify({ type: "turn.started" }),
      JSON.stringify({ type: "thread.started", thread_id: "thread_1" })
    ];

    expect(hasCodexThreadStarted(items)).toBe(true);
  });

  test("keeps global lifecycle events out of the user log", () => {
    expect(buildCodexLoadingLogItems([], [
      JSON.stringify({ type: "thread.started", thread_id: "thread_1" }),
      JSON.stringify({ type: "turn.started" }),
      JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1, reasoning_output_tokens: 0 } })
    ])).toEqual([]);
  });
});
