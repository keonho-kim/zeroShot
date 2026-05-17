import { describe, expect, test } from "bun:test";
import { buildDisabledReason, canStartBuild, canStartDesign, canStartUpdate, updateDisabledReason } from "@/entities/project/project-core";

describe("project core", () => {
  test("blocks BUILD for an empty workspace without ARCHITECT/PRODUCT.html", () => {
    const state = { isDirectoryEmpty: true, hasProductHtml: false };
    expect(canStartBuild(state)).toBe(false);
    expect(buildDisabledReason(state)).toBe("BUILD needs a product blueprint or non-empty workspace.");
  });

  test("allows BUILD when ARCHITECT/PRODUCT.html exists even if the workspace is otherwise empty", () => {
    expect(canStartBuild({ isDirectoryEmpty: true, hasProductHtml: true })).toBe(true);
  });

  test("allows BUILD for a non-empty workspace", () => {
    expect(canStartBuild({ isDirectoryEmpty: false, hasProductHtml: false })).toBe(true);
  });

  test("allows DESIGN only after a product blueprint exists", () => {
    expect(canStartDesign({ hasProductHtml: false })).toBe(false);
    expect(canStartDesign({ hasProductHtml: true })).toBe(true);
  });

  test("allows UPDATE only after a build run and source code exist", () => {
    expect(canStartUpdate({ runsCount: 0, hasSourceCode: true })).toBe(false);
    expect(updateDisabledReason({ runsCount: 0, hasSourceCode: true })).toBe("BUILD를 먼저 실행하세요.");
    expect(canStartUpdate({ runsCount: 1, hasSourceCode: false })).toBe(false);
    expect(updateDisabledReason({ runsCount: 1, hasSourceCode: false })).toBe("업데이트할 소스코드가 없습니다.");
    expect(canStartUpdate({ runsCount: 1, hasSourceCode: true })).toBe(true);
  });
});
