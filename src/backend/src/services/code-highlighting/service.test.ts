import { describe, expect, test } from "bun:test";
import { highlightCode, normalizeHighlightLanguage } from "@backend/services/code-highlighting/service";

describe("code highlighting service", () => {
  test("normalizes unsupported languages to plaintext", () => {
    expect(normalizeHighlightLanguage("typescript")).toBe("typescript");
    expect(normalizeHighlightLanguage("unknown")).toBe("plaintext");
  });

  test("highlights supported code with Shiki", async () => {
    const html = await highlightCode("const value: number = 1;", "typescript");

    expect(html).toContain("shiki");
    expect(html).toContain("const");
  });
});
