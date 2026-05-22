import { describe, expect, test } from "bun:test";
import { buildCodexLoadingLogItems, hasCodexThreadStarted } from "@/entities/codex/codex-loading-log";

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
      detail: "repo=zeroShot pr=13",
      status: "running",
      icon: "🛠️"
    }]);
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
      detail: "bun test"
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
    expect(items[2]?.detail).toBe("rg --files");
    expect(items[3]?.detail).toBe("ls");
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
