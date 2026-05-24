import { z } from "zod";

export const architectDecisionSchema = {
  type: "object",
  properties: {
    chatMessage: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    decisions: {
      type: "array",
      minItems: 5,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          prompt: { type: "string" },
          section: { type: "string" },
          options: {
            type: "array",
            minItems: 5,
            maxItems: 6,
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
  required: ["chatMessage", "title", "summary", "decisions"],
  additionalProperties: false
};

export const architectDecisionResponseSchema = z.object({
  chatMessage: z.string().trim().min(1),
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
    })).min(5).max(6)
  })).min(5).max(7)
});

export type ArchitectDecisionResponse = z.infer<typeof architectDecisionResponseSchema>;

export const architectProductHtmlSchema = {
  type: "object",
  properties: {
    chatMessage: { type: "string" },
    files: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          type: { type: "string" },
          title: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "type", "title", "content"],
        additionalProperties: false
      }
    }
  },
  required: ["chatMessage", "files"],
  additionalProperties: false
};

export const architectProductHtmlResponseSchema = z.object({
  chatMessage: z.string().trim().min(1),
  files: z.array(z.object({
    path: z.string().trim().min(1),
    type: z.string().trim().min(1),
    title: z.string().trim().min(1),
    content: z.string().trim().min(1)
  })).min(1).max(8)
});

export type ArchitectProductFile = z.infer<typeof architectProductHtmlResponseSchema>["files"][number];
