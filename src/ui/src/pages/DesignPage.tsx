import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/stores/app-store";
import {
  fetchDesignArtifact,
  fetchLatestDesign,
  fetchProductArtifact,
  fetchProjectSettings,
  fetchResources,
  requestDesignRecommendationsStream,
  requestDesignRuntimeStream,
  saveDesignArtifact,
  saveProjectSettings
} from "@/lib/api";
import type { DesignRecommendationResponse, DesignRuntimeMode, DesignRuntimeResponse } from "@/types/api";
import {
  buildArtifactSrcDoc,
  isArtifactBridgeMessage,
  type ArtifactBridgeMessage,
  type ArtifactEditorMode,
  type ArtifactEditTarget,
  type ArtifactHistoryEntry
} from "@/entities/design/artifact-editor";
import { ArtifactWorkbench } from "@/pages/design/artifact-workbench/ArtifactWorkbench";
import type { ArtifactChatMessage, ArtifactCommentCapture } from "@/pages/design/artifact-workbench/types";
import { DesignResult } from "@/pages/design/DesignResult";
import { DesignRuntimeSetup } from "@/pages/design/DesignRuntimeSetup";
import { CodexLoadingPanel } from "@/components/CodexLoadingPanel";
import { useI18n } from "@/lib/i18n";
import { type DesignTimelineItem, upsertTimelineItem } from "@/pages/design/design-page-model";
import { cn } from "@/utils/cn";

type MakeoverStep = "brief" | "loading" | "workbench" | "preview";
type DesignResourceSelectionMode = "manual" | "omakase";
type DesignRunRequest = {
  goal: string;
  assistantMessageId?: string;
  source: "request" | "workbench";
};

export function DesignPage() {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const artifactFrameRef = useRef<HTMLIFrameElement>(null);
  const projectRoot = useAppStore((state) => state.projectRoot);
  const [mode, setMode] = useState<DesignRuntimeMode>("codex");
  const [goal, setGoal] = useState("");
  const [activeDesignTemplateId, setActiveDesignTemplateId] = useState("");
  const [activeDesignSystemId, setActiveDesignSystemId] = useState("");
  const [activeDesignTemplateSelectionMode, setActiveDesignTemplateSelectionMode] = useState<DesignResourceSelectionMode>("manual");
  const [activeDesignSystemSelectionMode, setActiveDesignSystemSelectionMode] = useState<DesignResourceSelectionMode>("manual");
  const [recommendations, setRecommendations] = useState<DesignRecommendationResponse | null>(null);
  const [recommendationTimelineItems, setRecommendationTimelineItems] = useState<DesignTimelineItem[]>([]);
  const [recommendationMessages, setRecommendationMessages] = useState<string[]>([]);
  const [recommendationError, setRecommendationError] = useState("");
  const [timelineItems, setTimelineItems] = useState<DesignTimelineItem[]>([]);
  const [runtimeMessages, setRuntimeMessages] = useState<string[]>([]);
  const [runtimeError, setRuntimeError] = useState("");
  const [designResult, setDesignResult] = useState<DesignRuntimeResponse | null>(null);
  const [makeoverStep, setMakeoverStep] = useState<MakeoverStep>("brief");
  const [makeoverComplete, setMakeoverComplete] = useState(false);
  const [artifactMode, setArtifactMode] = useState<ArtifactEditorMode>("preview");
  const [artifactViewport, setArtifactViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [artifactZoom, setArtifactZoom] = useState(1);
  const [sourceDraft, setSourceDraft] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [artifactChatMessages, setArtifactChatMessages] = useState<ArtifactChatMessage[]>([]);
  const [artifactSource, setArtifactSource] = useState("");
  const [artifactTargets, setArtifactTargets] = useState<ArtifactEditTarget[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [artifactError, setArtifactError] = useState("");
  const [artifactEtag, setArtifactEtag] = useState("");
  const [sourceHistory, setSourceHistory] = useState<ArtifactHistoryEntry[]>([]);
  const [redoHistory, setRedoHistory] = useState<ArtifactHistoryEntry[]>([]);
  const [commentToolOpen, setCommentToolOpen] = useState(false);
  const [commentCapture, setCommentCapture] = useState<ArtifactCommentCapture | null>(null);

  const resourcesQuery = useQuery({
    queryKey: ["resources"],
    queryFn: fetchResources
  });
  const settingsQuery = useQuery({
    queryKey: ["project-settings", projectRoot],
    queryFn: () => fetchProjectSettings(projectRoot),
    enabled: Boolean(projectRoot)
  });
  const productArtifactQuery = useQuery({
    queryKey: ["product-artifact", projectRoot],
    queryFn: () => fetchProductArtifact(projectRoot),
    enabled: Boolean(projectRoot),
    retry: false
  });
  const designArtifactQuery = useQuery({
    queryKey: ["design-artifact", projectRoot],
    queryFn: () => fetchDesignArtifact(projectRoot),
    enabled: Boolean(projectRoot),
    retry: false
  });
  const latestDesignQuery = useQuery({
    queryKey: ["design-latest", projectRoot],
    queryFn: () => fetchLatestDesign(projectRoot),
    enabled: Boolean(projectRoot)
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }
    setActiveDesignTemplateId(settingsQuery.data.activeDesignTemplateId ?? "");
    setActiveDesignSystemId(settingsQuery.data.activeDesignSystemId ?? "");
    setActiveDesignTemplateSelectionMode("manual");
    setActiveDesignSystemSelectionMode("manual");
  }, [settingsQuery.data]);

  useEffect(() => {
    setDesignResult(latestDesignQuery.data ?? null);
  }, [latestDesignQuery.data]);

  useEffect(() => {
    setArtifactSource(designArtifactQuery.data?.content.trim() ? designArtifactQuery.data.content : "");
    setArtifactEtag(designArtifactQuery.data?.etag ?? "");
    setArtifactTargets([]);
    setSelectedTargetIds([]);
    setSourceHistory([]);
    setRedoHistory([]);
    setArtifactError("");
    setSourceDraft(designArtifactQuery.data?.content.trim() ? designArtifactQuery.data.content : "");
  }, [designArtifactQuery.data, projectRoot]);

  useEffect(() => {
    setMakeoverStep("brief");
    setMakeoverComplete(false);
    setRecommendations(null);
    setRecommendationTimelineItems([]);
    setRecommendationMessages([]);
    setRuntimeMessages([]);
    setRecommendationError("");
    setActiveDesignTemplateSelectionMode("manual");
    setActiveDesignSystemSelectionMode("manual");
    setArtifactMode("preview");
  }, [projectRoot]);

  useEffect(() => {
    if (designArtifactQuery.data?.content.trim()) {
      setMakeoverStep((current) => current === "brief" ? "workbench" : current);
    }
  }, [designArtifactQuery.data]);

  useEffect(() => {
    artifactFrameRef.current?.contentWindow?.postMessage({
      __zeroshotArtifact: true,
      type: "od-edit-mode",
      mode: artifactMode
    }, "*");
  }, [artifactMode]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (next: { activeSkillId: string; activeDesignTemplateId: string; activeDesignSystemId: string }) => saveProjectSettings({
      projectRoot,
      activeSkillId: next.activeSkillId || undefined,
      activeDesignTemplateId: next.activeDesignTemplateId || undefined,
      activeDesignSystemId: next.activeDesignSystemId || undefined
    })
  });

  const recommendationMutation = useMutation({
    mutationFn: async () => {
      setRecommendationError("");
      setRecommendationTimelineItems([]);
      setRecommendationMessages([]);
      return requestDesignRecommendationsStream({
        projectRoot,
        locale
      }, (event) => {
        setRecommendationTimelineItems((items) => upsertTimelineItem(items, event));
      }, undefined, (message) => {
        setRecommendationMessages((items) => items.at(-1) === message ? items : [...items, message]);
      });
    },
    onSuccess: (nextRecommendations) => {
      setRecommendations(nextRecommendations);
      setRecommendationError("");
      setActiveDesignSystemId((current) => nextRecommendations.designSystems.some((option) => option.resourceId === current) ? current : "");
      setActiveDesignTemplateId((current) => nextRecommendations.designTemplates.some((option) => option.resourceId === current) ? current : "");
      setActiveDesignSystemSelectionMode("manual");
      setActiveDesignTemplateSelectionMode("manual");
    },
    onError: (error) => {
      setRecommendationError(error instanceof Error ? error.message : String(error));
      setRecommendations(null);
    }
  });

  const designMutation = useMutation({
    mutationFn: async (request: DesignRunRequest) => {
      if (!productArtifactQuery.data?.content.trim()) {
        throw new Error(t("makeover.requiresProduct"));
      }
      const nextGoal = request.goal.trim() || t("makeover.defaultGoal");
      setRuntimeError("");
      setTimelineItems([]);
      setRuntimeMessages([]);
      return requestDesignRuntimeStream({
        projectRoot,
        mode,
        goal: nextGoal,
        locale,
        activeDesignTemplateId: activeDesignTemplateId || undefined,
        activeDesignSystemId: activeDesignSystemId || undefined
      }, (event) => {
        setTimelineItems((items) => upsertTimelineItem(items, event));
        if (request.assistantMessageId) {
          setArtifactChatMessages((messages) => messages.map((message) => message.id === request.assistantMessageId
            ? { ...message, progress: upsertTimelineItem(message.progress, event) }
            : message));
        }
      }, (message) => {
        if (!request.assistantMessageId) {
          return;
        }
        setArtifactChatMessages((messages) => messages.map((item) => item.id === request.assistantMessageId
          ? { ...item, content: message, isStreaming: true }
          : item));
      }, (message) => {
        setRuntimeMessages((items) => items.at(-1) === message ? items : [...items, message]);
      });
    },
    onSuccess: (design) => {
      setDesignResult(design);
      const nextDesignHtml = design.files.find((file) => file.path === "DESIGN/index.html")?.content;
      if (nextDesignHtml) {
        setArtifactSource(nextDesignHtml);
        setSourceDraft(nextDesignHtml);
      }
      setArtifactChatMessages((messages) => {
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
      setArtifactMode("preview");
      window.setTimeout(() => setMakeoverComplete(false), 1200);
      void queryClient.invalidateQueries({ queryKey: ["design-latest", projectRoot] });
      void queryClient.invalidateQueries({ queryKey: ["design-artifact", projectRoot] });
      void queryClient.invalidateQueries({ queryKey: ["project-state", projectRoot] });
    },
    onError: (error, request) => {
      setRuntimeError(error instanceof Error ? error.message : String(error));
      if (request.source === "request") {
        setMakeoverStep("brief");
      }
    }
  });

  const saveArtifactMutation = useMutation({
    mutationFn: async () => saveDesignArtifact({
      projectRoot,
      content: artifactSource,
      etag: artifactEtag
    }),
    onSuccess: (file) => {
      setArtifactEtag(file.etag);
      setArtifactSource(file.content);
      setSourceDraft(file.content);
      void queryClient.invalidateQueries({ queryKey: ["design-artifact", projectRoot] });
      void queryClient.invalidateQueries({ queryKey: ["project-state", projectRoot] });
      setArtifactError("");
    },
    onError: (error) => {
      setArtifactError(error instanceof Error ? error.message : String(error));
    }
  });

  const artifactSrcDoc = useMemo(() => buildArtifactSrcDoc(artifactSource, artifactMode), [artifactSource, artifactMode]);

  const undoArtifactChange = () => {
    const entry = sourceHistory.at(-1);
    if (!entry) {
      return;
    }
    setRedoHistory((items) => [entry, ...items.slice(0, 24)]);
    setSourceHistory((items) => items.slice(0, -1));
    setArtifactSource(entry.beforeSource);
    setSourceDraft(entry.beforeSource);
    setSelectedTargetIds([]);
  };

  const redoArtifactChange = () => {
    const entry = redoHistory[0];
    if (!entry) {
      return;
    }
    setSourceHistory((items) => [...items.slice(-24), entry]);
    setRedoHistory((items) => items.slice(1));
    setArtifactSource(entry.afterSource);
    setSourceDraft(entry.afterSource);
    setSelectedTargetIds([]);
  };

  const selectedTargets = useMemo(() => {
    const ids = new Set(selectedTargetIds);
    return artifactTargets.filter((target) => ids.has(target.id));
  }, [artifactTargets, selectedTargetIds]);

  useEffect(() => {
    artifactFrameRef.current?.contentWindow?.postMessage({
      __zeroshotArtifact: true,
      type: "od-highlight-targets",
      ids: selectedTargetIds
    }, "*");
  }, [selectedTargetIds]);

  useEffect(() => {
    if (!artifactTargets.length || !selectedTargetIds.length) {
      return;
    }
    const availableIds = new Set(artifactTargets.map((target) => target.id));
    setSelectedTargetIds((ids) => ids.filter((id) => availableIds.has(id)));
  }, [artifactTargets, selectedTargetIds.length]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== artifactFrameRef.current?.contentWindow || !isArtifactBridgeMessage(event.data)) {
        return;
      }
      const message = event.data as ArtifactBridgeMessage;
      if (message.type === "od-edit-targets") {
        setArtifactTargets(message.targets);
      }
      if (message.type === "od-edit-select") {
        setSelectedTargetIds((ids) => {
          if (message.additive) {
            return ids.includes(message.target.id)
              ? ids.filter((id) => id !== message.target.id)
              : [...ids, message.target.id];
          }
          return [message.target.id];
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const resources = resourcesQuery.data ?? { skills: [], designTemplates: [], designSystems: [] };
  const hasProductHtml = Boolean(productArtifactQuery.data?.content.trim());
  const hasDesignHtml = Boolean(designArtifactQuery.data?.content.trim());

  useEffect(() => {
    if (
      !projectRoot ||
      makeoverStep !== "brief" ||
      !hasProductHtml ||
      recommendations ||
      recommendationMutation.isPending ||
      recommendationError
    ) {
      return;
    }
    recommendationMutation.mutate();
  }, [hasProductHtml, makeoverStep, projectRoot, recommendationError, recommendationMutation, recommendations]);

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  const changeDesignTemplate = (nextDesignTemplateId: string, nextMode: DesignResourceSelectionMode) => {
    setActiveDesignTemplateId(nextDesignTemplateId);
    setActiveDesignTemplateSelectionMode(nextMode);
    saveSettingsMutation.mutate({ activeSkillId: "", activeDesignTemplateId: nextDesignTemplateId, activeDesignSystemId });
  };

  const changeDesignSystem = (nextDesignSystemId: string, nextMode: DesignResourceSelectionMode) => {
    setActiveDesignSystemId(nextDesignSystemId);
    setActiveDesignSystemSelectionMode(nextMode);
    saveSettingsMutation.mutate({ activeSkillId: "", activeDesignTemplateId, activeDesignSystemId: nextDesignSystemId });
  };

  const runMakeover = (requestedGoal: string) => {
    const nextGoal = requestedGoal.trim() || t("makeover.defaultGoal");
    setMode("codex");
    setArtifactError("");
    setRuntimeError("");
    setRuntimeMessages([]);
    setMakeoverStep("loading");
    designMutation.mutate({ goal: nextGoal, source: "request" });
  };

  const applySelectedTargetAiInstruction = () => {
    const targetContext = selectedTargets.length
      ? [
        "Selected canvas targets:",
        ...selectedTargets.map((target, index) => [
          `Target ${index + 1}:`,
          `- id: ${target.id}`,
          `- label: ${target.label}`,
          `- kind: ${target.kind}`,
          `- text: ${target.text}`,
          `- rect: x ${target.rect.x}, y ${target.rect.y}, width ${target.rect.width}, height ${target.rect.height}`,
          `- outerHtml: ${target.outerHtml.slice(0, 1200)}`
        ].join("\n"))
      ].join("\n")
      : "";
    const commentContext = commentCapture
      ? [
        "Canvas comment capture:",
        commentCapture.note ? `- comment text: ${commentCapture.note}` : "",
        "- Clean interactive canvas screenshot is attached below as a data URL.",
        commentCapture.cleanImage,
        "- Annotated screenshot shown to the user is attached below as a data URL.",
        commentCapture.annotatedImage
      ].filter(Boolean).join("\n")
      : "";
    if (!aiInstruction.trim() && !commentContext) {
      return;
    }
    const nextGoal = [
      "Update the existing DESIGN/index.html as one coherent interactive canvas.",
      "Do not wait for a selected element. Interpret the user's request against the full current canvas.",
      "Active resource instruction:",
      "Load and apply the active skill, design template, and design system context already configured for this project before making the change.",
      targetContext,
      commentContext,
      "Requested design change:",
      aiInstruction.trim(),
      "Current DESIGN/index.html source:",
      artifactSource || "(not available)"
    ].filter(Boolean).join("\n\n");
    setGoal(nextGoal);
    setMode("codex");
    setArtifactError("");
    const userMessage = aiInstruction.trim() || "Annotated canvas comment";
    const assistantMessageId = crypto.randomUUID();
    setArtifactChatMessages((messages) => [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: userMessage,
        createdAt: Date.now(),
        mentions: selectedTargets.map((target) => target.label),
        hasCommentCapture: Boolean(commentCapture),
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
    setAiInstruction("");
    setCommentCapture(null);
    setCommentToolOpen(false);
    setRuntimeError("");
    setRuntimeMessages([]);
    designMutation.mutate({ goal: nextGoal, assistantMessageId, source: "workbench" });
  };

  return (
    <div className={cn("builder-shell design-page", makeoverStep === "workbench" && "design-page-workbench-wide")}>
      <PageHeader title="DESIGN" projectRoot={projectRoot} />

      <div className="design-workbench">
        {makeoverStep !== "loading" ? (
          <div className="makeover-step-tabs" role="tablist" aria-label="Design pages">
            <Button variant={makeoverStep === "brief" ? "default" : "outline"} onClick={() => setMakeoverStep("brief")}>1. REQUEST</Button>
            <Button variant={makeoverStep === "workbench" ? "default" : "outline"} disabled={!hasDesignHtml} onClick={() => setMakeoverStep("workbench")}>2. DESIGN WORKBENCH</Button>
            <Button variant={makeoverStep === "preview" ? "default" : "outline"} disabled={!designResult} onClick={() => setMakeoverStep("preview")}>3. BRIEF PREVIEW</Button>
          </div>
        ) : null}

        {makeoverStep === "brief" ? (
          <DesignRuntimeSetup
            projectRoot={projectRoot}
            resources={resources}
            recommendations={recommendations}
            recommendationTimelineItems={recommendationTimelineItems}
            recommendationMessages={recommendationMessages}
            recommendationError={recommendationError}
            isLoadingRecommendations={recommendationMutation.isPending}
            designResult={designResult}
            hasProductHtml={hasProductHtml}
            goal={goal}
            setGoal={setGoal}
            activeDesignTemplateId={activeDesignTemplateId}
            activeDesignSystemId={activeDesignSystemId}
            activeDesignTemplateSelectionMode={activeDesignTemplateSelectionMode}
            activeDesignSystemSelectionMode={activeDesignSystemSelectionMode}
            runtimeError={runtimeError}
            timelineItems={timelineItems}
            isRunning={designMutation.isPending}
            isComplete={makeoverComplete}
            onChangeDesignTemplate={changeDesignTemplate}
            onChangeDesignSystem={changeDesignSystem}
            onRetryRecommendations={() => {
              setRecommendations(null);
              setRecommendationError("");
              recommendationMutation.mutate();
            }}
            onRun={() => runMakeover(goal)}
          />
        ) : null}

        {makeoverStep === "loading" ? (
          <Card className="makeover-loading-card">
            <CodexLoadingPanel
              label={t("makeover.runtimeLoadingLabel")}
              progressItems={timelineItems}
              messages={runtimeMessages}
              emptyMessage={t("makeover.loadingMessage")}
            />
          </Card>
        ) : null}

        {makeoverStep === "workbench" ? (
          <ArtifactWorkbench
            hasProductHtml={hasDesignHtml}
            artifactEtag={designArtifactQuery.data?.etag}
            artifactUpdatedAt={designArtifactQuery.data?.updatedAt}
            artifactFrameRef={artifactFrameRef}
            artifactSrcDoc={artifactSrcDoc}
            artifactMode={artifactMode}
            artifactViewport={artifactViewport}
            setArtifactViewport={setArtifactViewport}
            artifactZoom={artifactZoom}
            setArtifactZoom={setArtifactZoom}
            sourceDraft={sourceDraft}
            setSourceDraft={setSourceDraft}
            aiInstruction={aiInstruction}
            setAiInstruction={setAiInstruction}
            selectedTargets={selectedTargets}
            commentCapture={commentCapture}
            chatMessages={artifactChatMessages}
            isRunning={designMutation.isPending}
            artifactError={artifactError}
            sourceHistory={sourceHistory}
            redoHistory={redoHistory}
            isSaving={saveArtifactMutation.isPending}
            onReload={() => {
              void designArtifactQuery.refetch();
            }}
            commentToolOpen={commentToolOpen}
            onOpenCommentTool={() => setCommentToolOpen(true)}
            onCloseCommentTool={() => setCommentToolOpen(false)}
            onCaptureComment={setCommentCapture}
            onRemoveCommentCapture={() => setCommentCapture(null)}
            onClearTargetSelection={() => setSelectedTargetIds([])}
            onApplySelectedTargetAiInstruction={applySelectedTargetAiInstruction}
            onUndo={undoArtifactChange}
            onRedo={redoArtifactChange}
            onSave={() => saveArtifactMutation.mutate()}
          />
        ) : null}

        {makeoverStep === "preview" && designResult ? <DesignResult design={designResult} artifactHtml={artifactSource} /> : null}
      </div>
    </div>
  );
}
