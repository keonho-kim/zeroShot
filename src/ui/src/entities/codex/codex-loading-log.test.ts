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
      })
    ]);

    expect(items.map((item) => [item.icon, item.title])).toEqual([
      ["🔎", "Search files"],
      ["📁", "Browse files"]
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
