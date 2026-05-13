import { describe, expect, test } from "bun:test";
import { ensureBuildImplementationGuidance } from "@backend/services/build-guidance-service";

describe("build guidance service", () => {
  test("appends mandatory build implementation guidance once", () => {
    const content = ensureBuildImplementationGuidance("# PRODUCT\n\nBuild a planner.");
    const nextContent = ensureBuildImplementationGuidance(content);

    expect(content).toContain("## Build Implementation Guidance");
    expect(content).toContain("frontend/src");
    expect(content).toContain("backend/src");
    expect(content).toContain("Correctness");
    expect(nextContent).toBe(content);
  });
});
