import { describe, expect, test } from "bun:test";
import { designModeLabel, designResultStatus } from "@/entities/design/design-runtime";
import type { DesignRuntimeResponse } from "@/types/api";

describe("design runtime core", () => {
  test("labels supported editing modes", () => {
    expect(designModeLabel("codex")).toBe("Codex Canvas");
    expect(designModeLabel("figma")).toBe("와이어 프레임");
    expect(designModeLabel("powerpoint")).toBe("프레젠테이션");
  });

  test("reports latest design runtime status", () => {
    const design = {
      mode: "figma"
    } as DesignRuntimeResponse;

    expect(designResultStatus(null)).toBe("WAIT");
    expect(designResultStatus(design)).toBe("와이어 프레임");
  });
});
