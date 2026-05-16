import { describe, expect, test } from "bun:test";
import { languageForDocument } from "./code-language";

describe("languageForDocument", () => {
  test("maps common generated artifacts to Shiki languages", () => {
    expect(languageForDocument("FINAL_REPORT.md")).toBe("markdown");
    expect(languageForDocument("manifest.json")).toBe("json");
    expect(languageForDocument("changes.patch")).toBe("diff");
    expect(languageForDocument("src/main.tsx")).toBe("typescript");
  });

  test("falls back to plaintext for unknown files", () => {
    expect(languageForDocument("notes.log")).toBe("plaintext");
  });
});
