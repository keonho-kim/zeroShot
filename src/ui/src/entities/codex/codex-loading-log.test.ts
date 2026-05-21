import { describe, expect, test } from "bun:test";
import { buildCodexLoadingLogItems } from "@/entities/codex/codex-loading-log";

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
      icon: "🛠️"
    }]);
  });
});
