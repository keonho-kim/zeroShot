import { describe, expect, test } from "bun:test";
import { buildDesignPrompt } from "@backend/llm/makeover/prompt";
import { buildRecommendationPrompt } from "@backend/llm/makeover/recommendation-prompt";
import { composeDesignMarkdown, extractDesignChatMessage, validateDesignRecommendations } from "@backend/services/design-service";
import type { DesignRuntimeResponse } from "@backend/types/design";
import type { ResourceManifest } from "@backend/types/resource";

function resource(id: string): ResourceManifest {
  return {
    id,
    name: id,
    description: `${id} description`,
    tags: [],
    root: `/tmp/resources/${id}`,
    manifestPath: `/tmp/resources/${id}/SKILL.md`,
    body: "",
    files: []
  };
}

describe("design service", () => {
  test("keeps recommendation prompt as question flow and limits product evidence to ARCHITECT outputs", () => {
    const catalog = {
      skills: [resource("skill-a")],
      designSystems: ["system-a", "system-b", "system-c", "system-d", "system-e"].map(resource),
      designTemplates: ["template-a", "template-b", "template-c", "template-d", "template-e"].map(resource)
    };
    const prompt = buildRecommendationPrompt({
      locale: "en",
      productHtml: "<html>Product</html>",
      architectContext: "ARCHITECT/pages/workflow.html",
      catalog
    });

    expect(prompt.startsWith("/goal")).toBe(false);
    expect(prompt).toContain("Use ARCHITECT/PRODUCT.html as the primary product contract");
    expect(prompt).toContain("Use optional supporting files under ARCHITECT/");
    expect(prompt).toContain("Do not inspect bootstrap scaffold, source code, DESIGN output, runs, or unrelated project folders");
  });

  test("starts design runtime prompt as a goal and keeps DESIGN scoped to ARCHITECT plus selected resources", () => {
    const prompt = buildDesignPrompt({
      mode: "codex",
      goal: "Make it feel more polished.",
      locale: "en",
      productHtml: "<html>Product</html>",
      architectContext: "ARCHITECT/PRODUCT.html",
      resourceContext: "selected resources"
    });

    expect(prompt.startsWith("/goal")).toBe(true);
    expect(prompt).toContain("Use only ARCHITECT/PRODUCT.html, optional supporting files under ARCHITECT/, and selected resource context");
    expect(prompt).toContain("Do not inspect bootstrap scaffold, source code, or unrelated project folders");
    expect(prompt).toContain("DESIGN/index.html is required");
    expect(prompt).toContain("DESIGN/pages/");
    expect(prompt).toContain("DESIGN/components/");
    expect(prompt).toContain("DESIGN/assets/");
  });

  test("composes DESIGN runtime markdown from runtime output", () => {
    const response: DesignRuntimeResponse = {
      id: "design-1",
      projectRoot: "/tmp/project",
      mode: "figma",
      chatMessage: "I tightened the dashboard design and prepared the interactive canvas.",
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
        { path: "DESIGN/index.html", type: "text/html", title: "Design entry", description: "Interactive UI." },
        { path: "DESIGN/components/cards.html", type: "text/html", title: "Cards", description: "Component partial." }
      ],
      files: [
        { path: "DESIGN/index.html", type: "text/html", title: "Design entry", content: "<!doctype html><html><body>Design</body></html>" }
      ]
    };

    const markdown = composeDesignMarkdown(response);

    expect(markdown).toContain("Runtime mode: Wireframe");
    expect(markdown).toContain("## Layout");
    expect(markdown).toContain("**Create frames**");
    expect(markdown).toContain("`INTERACTIVE CANVAS`");
    expect(markdown).toContain("## Generated Files");
  });

  test("extracts chatMessage from complete and partial runtime JSON", () => {
    expect(extractDesignChatMessage('{"chatMessage":"Drafting the canvas now","title":"Design"}')).toBe("Drafting the canvas now");
    expect(extractDesignChatMessage('{"title":"Design","chatMessage":"Line one\\nLine two","files":[]')).toBe("Line one\nLine two");
    expect(extractDesignChatMessage('{"title":"Design"}')).toBe("");
  });

  test("validates design recommendation resource ids against the catalog", () => {
    const catalog = {
      designSystems: ["system-a", "system-b", "system-c", "system-d", "system-e"].map(resource),
      designTemplates: ["template-a", "template-b", "template-c", "template-d", "template-e"].map(resource)
    };
    const recommendations = validateDesignRecommendations({
      chatMessage: "I am matching the product with the best design resources.",
      title: "Recommended direction",
      summary: "Pick a system and template.",
      designSystems: catalog.designSystems.map((item, index) => ({
        id: `system-${index}`,
        resourceId: item.id,
        label: `System ${index + 1}`,
        detail: "User-facing design direction.",
        reason: "It matches the product plan."
      })),
      designTemplates: catalog.designTemplates.map((item, index) => ({
        id: `template-${index}`,
        resourceId: item.id,
        label: `Template ${index + 1}`,
        detail: "User-facing screen structure.",
        reason: "It supports the main workflow."
      }))
    }, catalog);

    expect(recommendations.designSystems).toHaveLength(5);
    expect(recommendations.designTemplates).toHaveLength(5);
    expect(recommendations.chatMessage).toBe("I am matching the product with the best design resources.");
  });

  test("rejects design recommendation resource ids outside the catalog", () => {
    const catalog = {
      designSystems: ["system-a", "system-b", "system-c", "system-d", "system-e"].map(resource),
      designTemplates: ["template-a", "template-b", "template-c", "template-d", "template-e"].map(resource)
    };

    expect(() => validateDesignRecommendations({
      chatMessage: "I am matching the product with the best design resources.",
      title: "Recommended direction",
      summary: "Pick a system and template.",
      designSystems: [
        ...catalog.designSystems.slice(0, 4).map((item, index) => ({
          id: `system-${index}`,
          resourceId: item.id,
          label: `System ${index + 1}`,
          detail: "User-facing design direction.",
          reason: "It matches the product plan."
        })),
        {
          id: "system-invalid",
          resourceId: "missing-system",
          label: "Missing system",
          detail: "Invalid design direction.",
          reason: "This must fail."
        }
      ],
      designTemplates: catalog.designTemplates.map((item, index) => ({
        id: `template-${index}`,
        resourceId: item.id,
        label: `Template ${index + 1}`,
        detail: "User-facing screen structure.",
        reason: "It supports the main workflow."
      }))
    }, catalog)).toThrow("unknown resourceId");
  });
});
