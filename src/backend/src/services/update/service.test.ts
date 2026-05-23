import { describe, expect, test } from "bun:test";
import { validateConcreteUpdateDecisions, type UpdateDecisionResponse } from "@backend/services/update/service";

function updateDecisionSet(optionIds: string[]): UpdateDecisionResponse {
  return {
    chatMessage: "Choose update details.",
    title: "Update choices",
    summary: "Concrete update options.",
    decisions: [
      {
        id: "scope",
        title: "Scope",
        prompt: "Choose the scope.",
        section: "Scope",
        options: optionIds.map((id) => ({
          id,
          label: id,
          detail: `${id} detail`,
          productRequirement: `${id} requirement`
        }))
      },
      {
        id: "validation",
        title: "Validation",
        prompt: "Choose validation.",
        section: "Validation",
        options: ["unit", "browser", "build", "typecheck", "manual"].map((id) => ({
          id,
          label: id,
          detail: `${id} detail`,
          productRequirement: `${id} requirement`
        }))
      },
      {
        id: "risk",
        title: "Risk",
        prompt: "Choose risk.",
        section: "Risk",
        options: ["small", "medium", "large", "ui", "api"].map((id) => ({
          id,
          label: id,
          detail: `${id} detail`,
          productRequirement: `${id} requirement`
        }))
      }
    ]
  };
}

describe("update service", () => {
  test("rejects Codex self-selection options in UPDATE decisions", () => {
    expect(() => validateConcreteUpdateDecisions(updateDecisionSet(["one", "two", "three", "four", "omakase"]))).toThrow("must not include");
  });

  test("accepts concrete user-selectable UPDATE decisions", () => {
    const decisions = updateDecisionSet(["one", "two", "three", "four", "five"]);
    expect(validateConcreteUpdateDecisions(decisions)).toBe(decisions);
  });
});
