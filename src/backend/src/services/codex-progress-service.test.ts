import { describe, expect, test } from "bun:test";
import type { ThreadEvent } from "@openai/codex-sdk";
import { describeCodexProgress } from "@backend/services/codex-progress-service";

const copy = {
  reasoningTitle: "범위 검토",
  reasoningDetail: "요청과 제약을 나누고 있습니다.",
  agentTitle: "응답 작성",
  agentDetail: "사용자에게 보여줄 내용을 작성하고 있습니다."
};

describe("codex progress service", () => {
  test("describes tool, search, command, and file events as compact progress", () => {
    expect(describeCodexProgress({
      type: "item.updated",
      item: { type: "web_search", id: "search-1", query: "RSS browser extension UI guidance" }
    } as ThreadEvent, "ko", copy)).toMatchObject({
      id: "search-search-1",
      title: "검색 중",
      detail: "RSS browser extension UI guidance",
      status: "running"
    });

    expect(describeCodexProgress({
      type: "item.completed",
      item: { type: "mcp_tool_call", id: "tool-1", server: "browser", tool: "open", status: "completed" }
    } as ThreadEvent, "ko", copy)).toMatchObject({
      title: "도구 호출",
      detail: "browser.open · completed",
      status: "completed"
    });

    expect(describeCodexProgress({
      type: "item.updated",
      item: { type: "command_execution", id: "cmd-1", status: "running", command: "bun test" }
    } as ThreadEvent, "ko", copy)).toMatchObject({
      title: "명령 실행",
      detail: "running: bun test",
      status: "running"
    });

    expect(describeCodexProgress({
      type: "item.completed",
      item: { type: "file_change", id: "file-1", changes: [{ kind: "update", path: "src/ui/App.tsx" }] }
    } as ThreadEvent, "ko", copy)).toMatchObject({
      title: "파일 변경",
      detail: "update:src/ui/App.tsx",
      status: "completed"
    });
  });

  test("uses caller-provided copy for reasoning and agent message events", () => {
    expect(describeCodexProgress({
      type: "item.updated",
      item: { type: "reasoning", id: "reasoning-1" }
    } as ThreadEvent, "ko", copy)).toMatchObject({
      title: "범위 검토",
      detail: "요청과 제약을 나누고 있습니다."
    });

    expect(describeCodexProgress({
      type: "item.updated",
      item: { type: "agent_message", id: "message-1" }
    } as ThreadEvent, "ko", copy)).toMatchObject({
      title: "응답 작성",
      detail: "사용자에게 보여줄 내용을 작성하고 있습니다."
    });
  });
});
