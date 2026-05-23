import { z } from "zod";

export const designRuntimeSchema = {
  type: "object",
  properties: {
    chatMessage: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    sections: {
      type: "array",
      minItems: 3,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          body: { type: "string" }
        },
        required: ["id", "title", "body"],
        additionalProperties: false
      }
    },
    actions: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          detail: { type: "string" },
          owner: { type: "string", enum: ["codex", "designer", "reviewer"] }
        },
        required: ["label", "detail", "owner"],
        additionalProperties: false
      }
    },
    artifacts: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          type: { type: "string" },
          title: { type: "string" },
          description: { type: "string" }
        },
        required: ["path", "type", "title", "description"],
        additionalProperties: false
      }
    },
    files: {
      type: "array",
      minItems: 1,
      maxItems: 6,
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
  required: ["chatMessage", "title", "summary", "sections", "actions", "artifacts", "files"],
  additionalProperties: false
};

export const designRuntimeResponseSchema = z.object({
  chatMessage: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  sections: z.array(z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    body: z.string().trim().min(1)
  })).min(3).max(7),
  actions: z.array(z.object({
    label: z.string().trim().min(1),
    detail: z.string().trim().min(1),
    owner: z.enum(["codex", "designer", "reviewer"])
  })).min(3).max(8),
  artifacts: z.array(z.object({
    path: z.string().trim().min(1),
    type: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1)
  })).min(2).max(6),
  files: z.array(z.object({
    path: z.string().trim().min(1),
    type: z.string().trim().min(1),
    title: z.string().trim().min(1),
    content: z.string().trim().min(1)
  })).min(1).max(6)
});

export const designRecommendationSchema = {
  type: "object",
  properties: {
    chatMessage: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    designSystems: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          resourceId: { type: "string" },
          label: { type: "string" },
          detail: { type: "string" },
          reason: { type: "string" }
        },
        required: ["id", "resourceId", "label", "detail", "reason"],
        additionalProperties: false
      }
    },
    designTemplates: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          resourceId: { type: "string" },
          label: { type: "string" },
          detail: { type: "string" },
          reason: { type: "string" }
        },
        required: ["id", "resourceId", "label", "detail", "reason"],
        additionalProperties: false
      }
    }
  },
  required: ["chatMessage", "title", "summary", "designSystems", "designTemplates"],
  additionalProperties: false
};

export const designRecommendationResponseSchema = z.object({
  chatMessage: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  designSystems: z.array(z.object({
    id: z.string().trim().min(1),
    resourceId: z.string().trim().min(1),
    label: z.string().trim().min(1),
    detail: z.string().trim().min(1),
    reason: z.string().trim().min(1)
  })).length(5),
  designTemplates: z.array(z.object({
    id: z.string().trim().min(1),
    resourceId: z.string().trim().min(1),
    label: z.string().trim().min(1),
    detail: z.string().trim().min(1),
    reason: z.string().trim().min(1)
  })).length(5)
});
