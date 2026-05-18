import { describe, expect, test } from "bun:test";
import { parseStreamEvent } from "@/lib/api";

describe("api stream parser", () => {
  test("parses progress, message, complete, and error SSE chunks", () => {
    expect(parseStreamEvent('event: progress\ndata: {"id":"analysis","title":"분석 중","detail":"","status":"running"}')).toEqual({
      event: "progress",
      data: { id: "analysis", title: "분석 중", detail: "", status: "running" }
    });
    expect(parseStreamEvent('event: message\ndata: {"message":"캔버스를 정리하고 있습니다."}')).toEqual({
      event: "message",
      data: { message: "캔버스를 정리하고 있습니다." }
    });
    expect(parseStreamEvent('event: complete\ndata: {"design":{"id":"design-1"}}')).toEqual({
      event: "complete",
      data: { design: { id: "design-1" } }
    });
    expect(parseStreamEvent('event: error\ndata: {"message":"failed"}')).toEqual({
      event: "error",
      data: { message: "failed" }
    });
  });

  test("ignores incomplete SSE chunks", () => {
    expect(parseStreamEvent("event: message")).toBeNull();
    expect(parseStreamEvent('data: {"message":"missing event"}')).toBeNull();
  });
});
