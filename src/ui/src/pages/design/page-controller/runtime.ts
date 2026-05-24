import { type QueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { requestDesignRuntimeStream } from "@/lib/api/design";
import type { DesignRuntimeMode, DesignRuntimeResponse } from "@/types/api";
import type { TranslationKey } from "@/lib/i18n-core";
import type { ArtifactEditTarget } from "@/entities/design/artifact-editor/types";
import { type DesignTimelineItem, upsertTimelineItem } from "@/pages/design/design-page-model";
import type { ArtifactChatMessage, ArtifactCommentCapture } from "@/pages/design/artifact-workbench/types";
import { composeDesignAiInstruction } from "@/pages/design/design-ai-instruction";
import type { DesignRunRequest, MakeoverStep } from "@/pages/design/page-controller/types";

export function useDesignRuntimeController(params: {
  activeDesignSystemId: string;
  activeDesignTemplateId: string;
  aiInstruction: string;
  artifactSource: string;
  commentCapture: ArtifactCommentCapture | null;
  hasDesignHtml: boolean;
  productHtml: string;
  projectRoot: string;
  locale: string;
  queryClient: QueryClient;
  selectedTargets: ArtifactEditTarget[];
  setAiInstruction: (value: string) => void;
  setArtifactChatMessages: (value: ArtifactChatMessage[] | ((current: ArtifactChatMessage[]) => ArtifactChatMessage[])) => void;
  setArtifactError: (value: string) => void;
  setArtifactMode: (value: "preview") => void;
  setArtifactSource: (value: string) => void;
  setCommentCapture: (value: ArtifactCommentCapture | null) => void;
  setCommentToolOpen: (value: boolean) => void;
  setDesignResult: (value: DesignRuntimeResponse | null) => void;
  setSourceDraft: (value: string) => void;
  t: (key: TranslationKey) => string;
}) {
  const [mode, setMode] = useState<DesignRuntimeMode>("codex");
  const [goal, setGoal] = useState("");
  const [timelineItems, setTimelineItems] = useState<DesignTimelineItem[]>([]);
  const [runtimeMessages, setRuntimeMessages] = useState<string[]>([]);
  const [runtimeError, setRuntimeError] = useState("");
  const [makeoverStep, setMakeoverStep] = useState<MakeoverStep>("brief");
  const [makeoverComplete, setMakeoverComplete] = useState(false);

  useEffect(() => {
    setMakeoverStep("brief");
    setMakeoverComplete(false);
    setRuntimeMessages([]);
    setRuntimeError("");
    setMode("codex");
  }, [params.projectRoot]);

  useEffect(() => {
    if (params.hasDesignHtml) {
      setMakeoverStep((current) => current === "brief" ? "workbench" : current);
    }
  }, [params.hasDesignHtml]);

  const designMutation = useMutation({
    mutationFn: async (request: DesignRunRequest) => {
      if (!params.productHtml.trim()) {
        throw new Error(params.t("makeover.requiresProduct"));
      }
      const nextGoal = request.goal.trim() || params.t("makeover.defaultGoal");
      setRuntimeError("");
      setTimelineItems([]);
      setRuntimeMessages([]);
      return requestDesignRuntimeStream({
        projectRoot: params.projectRoot,
        mode,
        goal: nextGoal,
        locale: params.locale,
        activeDesignTemplateId: params.activeDesignTemplateId || undefined,
        activeDesignSystemId: params.activeDesignSystemId || undefined
      }, (event) => {
        setTimelineItems((items) => upsertTimelineItem(items, event));
        if (request.assistantMessageId) {
          params.setArtifactChatMessages((messages) => messages.map((message) => message.id === request.assistantMessageId
            ? { ...message, progress: upsertTimelineItem(message.progress, event) }
            : message));
        }
      }, (message) => {
        if (!request.assistantMessageId) {
          return;
        }
        params.setArtifactChatMessages((messages) => messages.map((item) => item.id === request.assistantMessageId
          ? { ...item, content: message, isStreaming: true }
          : item));
      }, (message) => {
        setRuntimeMessages((items) => items.at(-1) === message ? items : [...items, message]);
      });
    },
    onSuccess: (design) => {
      params.setDesignResult(design);
      const nextDesignHtml = design.files.find((file) => file.path === "DESIGN/index.html")?.content;
      if (nextDesignHtml) {
        params.setArtifactSource(nextDesignHtml);
        params.setSourceDraft(nextDesignHtml);
      }
      params.setArtifactChatMessages((messages) => {
        const updated = messages.map((message) => message.isStreaming
          ? { ...message, content: design.chatMessage, isStreaming: false }
          : message);
        return updated.length ? updated : [{
          id: crypto.randomUUID(),
          role: "assistant",
          content: design.chatMessage,
          createdAt: Date.now(),
          mentions: [],
          hasCommentCapture: false,
          progress: [],
          isStreaming: false
        }];
      });
      setMakeoverComplete(true);
      setMakeoverStep("workbench");
      params.setArtifactMode("preview");
      window.setTimeout(() => setMakeoverComplete(false), 1200);
      void params.queryClient.invalidateQueries({ queryKey: ["design-latest", params.projectRoot] });
      void params.queryClient.invalidateQueries({ queryKey: ["design-artifact", params.projectRoot] });
      void params.queryClient.invalidateQueries({ queryKey: ["project-state", params.projectRoot] });
    },
    onError: (error, request) => {
      setRuntimeError(error instanceof Error ? error.message : String(error));
      if (request.source === "request") {
        setMakeoverStep("brief");
      }
    }
  });

  const runMakeover = (requestedGoal: string) => {
    const nextGoal = requestedGoal.trim() || params.t("makeover.defaultGoal");
    setMode("codex");
    params.setArtifactError("");
    setRuntimeError("");
    setRuntimeMessages([]);
    setMakeoverStep("loading");
    designMutation.mutate({ goal: nextGoal, source: "request" });
  };

  const applySelectedTargetAiInstruction = () => {
    if (!params.aiInstruction.trim() && !params.commentCapture) {
      return;
    }
    const nextGoal = composeDesignAiInstruction({
      selectedTargets: params.selectedTargets,
      commentCapture: params.commentCapture,
      aiInstruction: params.aiInstruction,
      artifactSource: params.artifactSource
    });
    setGoal(nextGoal);
    setMode("codex");
    params.setArtifactError("");
    const userMessage = params.aiInstruction.trim() || "Annotated canvas comment";
    const assistantMessageId = crypto.randomUUID();
    params.setArtifactChatMessages((messages) => [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: userMessage,
        createdAt: Date.now(),
        mentions: params.selectedTargets.map((target) => target.label),
        hasCommentCapture: Boolean(params.commentCapture),
        progress: []
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        mentions: [],
        hasCommentCapture: false,
        progress: [],
        isStreaming: true
      }
    ]);
    params.setAiInstruction("");
    params.setCommentCapture(null);
    params.setCommentToolOpen(false);
    setRuntimeError("");
    setRuntimeMessages([]);
    designMutation.mutate({ goal: nextGoal, assistantMessageId, source: "workbench" });
  };

  return {
    applySelectedTargetAiInstruction,
    designMutation,
    goal,
    makeoverComplete,
    makeoverStep,
    mode,
    runMakeover,
    runtimeError,
    runtimeMessages,
    setGoal,
    setMakeoverStep,
    setRuntimeError,
    setRuntimeMessages,
    timelineItems
  };
}
