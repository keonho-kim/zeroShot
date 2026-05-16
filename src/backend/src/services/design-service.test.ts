import { describe, expect, test } from "bun:test";
import { composeDesignMarkdown } from "@backend/services/design-service";
import type { DesignRuntimeResponse } from "@backend/types";

describe("design service", () => {
  test("composes DESIGN.md from runtime output", () => {
    const response: DesignRuntimeResponse = {
      id: "design-1",
      projectRoot: "/tmp/project",
      mode: "figma",
      title: "Dashboard design pass",
      summary: "Create a dense operational dashboard.",
      generatedAt: "2026-05-13T00:00:00.000Z",
      designMarkdown: "",
      sections: [
        { id: "layout", title: "Layout", body: "Use a two-column frame system." },
        { id: "components", title: "Components", body: "Define states for cards and filters." },
        { id: "handoff", title: "Handoff", body: "Keep tokens visible in layer names." }
      ],
      actions: [
        { label: "Create frames", detail: "Build desktop and mobile frames.", owner: "designer" },
        { label: "Check states", detail: "Review hover and disabled states.", owner: "reviewer" },
        { label: "Implement", detail: "Apply the component states in code.", owner: "codex" }
      ],
      artifacts: [
        { path: "DESIGN.md", type: "text/markdown", title: "Design brief", description: "Runtime output." },
        { path: "DESIGN.runtime.json", type: "application/json", title: "Runtime JSON", description: "Structured output." }
      ]
    };

    const markdown = composeDesignMarkdown(response);

    expect(markdown).toContain("Runtime mode: Wireframe");
    expect(markdown).toContain("## Layout");
    expect(markdown).toContain("**Create frames**");
    expect(markdown).toContain("`DESIGN.runtime.json`");
  });
});
