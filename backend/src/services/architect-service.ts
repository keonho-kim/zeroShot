import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode } from "@openai/codex-sdk";
import { z } from "zod";

const architectDecisionSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    decisions: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          prompt: { type: "string" },
          section: { type: "string" },
          options: {
            type: "array",
            minItems: 2,
            maxItems: 5,
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                label: { type: "string" },
                detail: { type: "string" },
                productRequirement: { type: "string" }
              },
              required: ["id", "label", "detail", "productRequirement"],
              additionalProperties: false
            }
          }
        },
        required: ["id", "title", "prompt", "section", "options"],
        additionalProperties: false
      }
    }
  },
  required: ["title", "summary", "decisions"],
  additionalProperties: false
};

const architectDecisionResponseSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  decisions: z.array(z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    prompt: z.string().trim().min(1),
    section: z.string().trim().min(1),
    options: z.array(z.object({
      id: z.string().trim().min(1),
      label: z.string().trim().min(1),
      detail: z.string().trim().min(1),
      productRequirement: z.string().trim().min(1)
    })).min(2).max(5)
  })).min(2).max(5)
});

export type ArchitectDecisionResponse = z.infer<typeof architectDecisionResponseSchema>;

function asReasoningEffort(value: string): ModelReasoningEffort {
  if (value === "minimal" || value === "low" || value === "medium" || value === "high" || value === "xhigh") {
    return value;
  }
  throw new Error(`Unsupported reasoning effort: ${value}`);
}

function buildArchitectPrompt(goal: string, locale: string): string {
  return `You are ZeroShot ARCHITECT.

The user is describing a product they want to build. Convert the conversation into a few concrete product decisions that the user must choose before ZeroShot can write PRODUCT.html.

Rules:
- Return only JSON matching the provided schema.
- Do not edit files, run commands, or inspect the repository unless it is necessary to understand the workspace.
- Ask for 2 to 5 decisions.
- Each decision must include 2 to 5 mutually exclusive options.
- Options must be concrete product directions, not vague preferences.
- The option productRequirement must be written as an implementation-ready requirement for PRODUCT.html.
- Do not include "unsure", "autopilot", or fallback options.
- Use ${locale === "ko" ? "Korean" : "English"} for all user-facing text.

User conversation:
${goal}`;
}

export async function buildArchitectDecisions(params: {
  projectRoot: string;
  goal: string;
  locale: string;
  reasoning: string;
  model?: string;
}): Promise<ArchitectDecisionResponse> {
  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: params.projectRoot,
    skipGitRepoCheck: true,
    approvalPolicy: "never" satisfies ApprovalMode,
    sandboxMode: "read-only" satisfies SandboxMode,
    modelReasoningEffort: asReasoningEffort(params.reasoning),
    ...(params.model ? { model: params.model } : {})
  });

  const { events } = await thread.runStreamed(buildArchitectPrompt(params.goal, params.locale), {
    outputSchema: architectDecisionSchema
  });
  let finalResponse = "";

  for await (const event of events) {
    if (event.type === "item.completed" && event.item.type === "agent_message") {
      finalResponse = event.item.text;
    }
    if (event.type === "turn.failed") {
      throw new Error(event.error.message);
    }
    if (event.type === "error") {
      throw new Error(event.message);
    }
  }

  if (!finalResponse.trim()) {
    throw new Error("Codex did not return architect decisions.");
  }

  const parsed = architectDecisionResponseSchema.parse(JSON.parse(finalResponse));
  return parsed;
}
