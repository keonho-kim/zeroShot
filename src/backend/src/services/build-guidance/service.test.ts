import { describe, expect, test } from "bun:test";
import { ensureBuildImplementationGuidance } from "@backend/services/build-guidance/service";

describe("build guidance service", () => {
  test("appends mandatory build implementation guidance once", () => {
    const content = ensureBuildImplementationGuidance("# PRODUCT\n\nBuild a planner.");
    const nextContent = ensureBuildImplementationGuidance(content);

    expect(content).toContain("## Build Implementation Guidance");
    expect(content).toContain("full-stack backend code lives under src/server");
    expect(content).toContain("full-stack frontend code lives under src/ui");
    expect(content).not.toContain("src/backend/src");
    expect(content).toContain("services/<domain>/{const|constants");
    expect(content).toContain("Frontend structure");
    expect(content).toContain("Correctness");
    expect(nextContent).toBe(content);
  });
});
