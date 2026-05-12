import { describe, expect, test } from "bun:test";
import { composeBuildProductContent } from "./build-request";

describe("build request composition", () => {
  test("keeps uploaded PRODUCT.md and appends selected build focus", () => {
    const content = composeBuildProductContent({
      source: "product-md",
      productMarkdown: "# PRODUCT\n\nBuild a planner.",
      additionalRequest: "",
      focus: "polish"
    });

    expect(content).toContain("# PRODUCT");
    expect(content).toContain("Build a planner.");
    expect(content).toContain("polished arcade-scale UI");
  });

  test("uses PRODUCT.html as canonical source and appends additional request", () => {
    const content = composeBuildProductContent({
      source: "product-html",
      productMarkdown: "",
      additionalRequest: "Make the primary action easier to reach.",
      focus: "faithful"
    });

    expect(content).toContain("Use PRODUCT.html in the project root as the canonical source");
    expect(content).toContain("Make the primary action easier to reach.");
  });
});
