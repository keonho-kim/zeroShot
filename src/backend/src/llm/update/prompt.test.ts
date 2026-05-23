import { describe, expect, test } from "bun:test";
import { buildUpdatePrompt } from "@backend/llm/update/prompt";

describe("update prompt", () => {
  test("keeps update question generation outside the goal execution command", () => {
    const prompt = buildUpdatePrompt("Improve the dashboard filtering flow.", "en");

    expect(prompt.startsWith("/goal")).toBe(false);
    expect(prompt).toContain("Convert the request into concrete update decisions");
    expect(prompt).toContain("Do not edit files or run commands");
    expect(prompt).toContain("exactly 5 mutually exclusive concrete options");
    expect(prompt).not.toContain("Let Codex choose");
    expect(prompt).not.toContain("알아서 해주세요");
  });
});
