import { describe, expect, test } from "bun:test";
import { buildDisabledReason, canStartBuild, canStartDesign } from "@/entities/project/project-core";

describe("project core", () => {
  test("blocks BUILD for an empty workspace without PRODUCT.html", () => {
    const state = { isDirectoryEmpty: true, hasProductHtml: false };
    expect(canStartBuild(state)).toBe(false);
    expect(buildDisabledReason(state)).toBe("BUILD needs a product blueprint or non-empty workspace.");
  });

  test("allows BUILD when PRODUCT.html exists even if the workspace is otherwise empty", () => {
    expect(canStartBuild({ isDirectoryEmpty: true, hasProductHtml: true })).toBe(true);
  });

  test("allows BUILD for a non-empty workspace", () => {
    expect(canStartBuild({ isDirectoryEmpty: false, hasProductHtml: false })).toBe(true);
  });

  test("allows DESIGN only after a product blueprint exists", () => {
    expect(canStartDesign({ hasProductHtml: false })).toBe(false);
    expect(canStartDesign({ hasProductHtml: true })).toBe(true);
  });
});
