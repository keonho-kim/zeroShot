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
  requestDesignRuntimeStream,
  saveDesignArtifact,
  saveProjectSettings
} from "@/lib/api";
import type { DesignRuntimeMode, DesignRuntimeResponse } from "@/types/api";
import {
  applyArtifactSourcePatch,
  type ArtifactEditorTab,
  buildArtifactSrcDoc,
  isArtifactBridgeMessage,
  nextTextFromKey,
  patchLabel,
  readTargetAttributesAsJson,
  translatedStyle,
  type ArtifactBridgeMessage,
  type ArtifactEditorMode,
  type ArtifactEditTarget,
  type ArtifactHistoryEntry,
  type ArtifactSourcePatch
} from "@/entities/design/artifact-editor";
import { ArtifactWorkbench } from "@/pages/design/artifact-workbench/ArtifactWorkbench";
import { DesignResult } from "@/pages/design/DesignResult";
import { DesignRuntimeSetup } from "@/pages/design/DesignRuntimeSetup";
import { type DesignTimelineItem, upsertTimelineItem } from "@/pages/design/design-page-model";
import { cn } from "@/utils/cn";

type MakeoverStep = "brief" | "loading" | "workbench" | "preview";

function AgentLoadingStage(props: { label: string }) {
  return (
    <div className="agent-loading-stage" role="status" aria-live="polite">
      <span className="agent-dot-wave" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <h2>{props.label}</h2>
    </div>
  );
}

export function DesignPage() {
  const queryClient = useQueryClient();
  const artifactFrameRef = useRef<HTMLIFrameElement>(null);
  const projectRoot = useAppStore((state) => state.projectRoot);
  const locale = useMemo(() => navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en", []);
  const [mode, setMode] = useState<DesignRuntimeMode>("codex");
  const [goal, setGoal] = useState("");
  const [activeDesignTemplateId, setActiveDesignTemplateId] = useState("");
  const [activeDesignSystemId, setActiveDesignSystemId] = useState("");
  const [timelineItems, setTimelineItems] = useState<DesignTimelineItem[]>([]);
  const [runtimeError, setRuntimeError] = useState("");
  const [designResult, setDesignResult] = useState<DesignRuntimeResponse | null>(null);
  const [makeoverStep, setMakeoverStep] = useState<MakeoverStep>("brief");
  const [makeoverComplete, setMakeoverComplete] = useState(false);
  const [artifactMode, setArtifactMode] = useState<ArtifactEditorMode>("preview");
  const [artifactTab, setArtifactTab] = useState<ArtifactEditorTab>("content");
  const [artifactViewport, setArtifactViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [artifactZoom, setArtifactZoom] = useState(1);
  const [layerSearch, setLayerSearch] = useState("");
  const [attributeDraft, setAttributeDraft] = useState("{}");
  const [outerHtmlDraft, setOuterHtmlDraft] = useState("");
  const [sourceDraft, setSourceDraft] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [artifactSource, setArtifactSource] = useState("");
  const [artifactTargets, setArtifactTargets] = useState<ArtifactEditTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<ArtifactEditTarget | null>(null);
  const [artifactError, setArtifactError] = useState("");
  const [artifactEtag, setArtifactEtag] = useState("");
  const [sourceHistory, setSourceHistory] = useState<ArtifactHistoryEntry[]>([]);
  const [redoHistory, setRedoHistory] = useState<ArtifactHistoryEntry[]>([]);

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
  }, [settingsQuery.data]);

  useEffect(() => {
    setDesignResult(latestDesignQuery.data ?? null);
  }, [latestDesignQuery.data]);

  useEffect(() => {
    setArtifactSource(designArtifactQuery.data?.content.trim() ? designArtifactQuery.data.content : "");
    setArtifactEtag(designArtifactQuery.data?.etag ?? "");
    setArtifactTargets([]);
    setSelectedTarget(null);
    setSourceHistory([]);
    setRedoHistory([]);
    setArtifactError("");
    setSourceDraft(designArtifactQuery.data?.content.trim() ? designArtifactQuery.data.content : "");
  }, [designArtifactQuery.data, projectRoot]);

  useEffect(() => {
    setMakeoverStep("brief");
    setMakeoverComplete(false);
    setArtifactMode("preview");
  }, [projectRoot]);

  useEffect(() => {
    if (designArtifactQuery.data?.content.trim()) {
      setMakeoverStep((current) => current === "brief" ? "workbench" : current);
    }
  }, [designArtifactQuery.data]);

  useEffect(() => {
    setAttributeDraft(readTargetAttributesAsJson(selectedTarget));
    setOuterHtmlDraft(selectedTarget?.outerHtml ?? "");
  }, [selectedTarget]);

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

  const designMutation = useMutation({
    mutationFn: async (requestedGoal: string) => {
      if (!productArtifactQuery.data?.content.trim()) {
        throw new Error("PRODUCT BLUEPRINT를 먼저 만들어야 DESIGN을 실행할 수 있습니다.");
      }
      const nextGoal = requestedGoal.trim();
      if (!nextGoal) {
        throw new Error("MAKEOVER 요청을 입력하거나 알아서 해주세요를 선택해야 합니다.");
      }
      setRuntimeError("");
      setTimelineItems([]);
      return requestDesignRuntimeStream({
        projectRoot,
        mode,
        goal: nextGoal,
        locale,
        activeDesignTemplateId: activeDesignTemplateId || undefined,
        activeDesignSystemId: activeDesignSystemId || undefined
      }, (event) => {
        setTimelineItems((items) => upsertTimelineItem(items, event));
      });
    },
    onSuccess: (design) => {
      setDesignResult(design);
      setTimelineItems([]);
      setMakeoverComplete(true);
      setMakeoverStep("workbench");
      setArtifactMode("preview");
      window.setTimeout(() => setMakeoverComplete(false), 1200);
      void queryClient.invalidateQueries({ queryKey: ["design-latest", projectRoot] });
      void queryClient.invalidateQueries({ queryKey: ["design-artifact", projectRoot] });
      void queryClient.invalidateQueries({ queryKey: ["project-state", projectRoot] });
    },
    onError: (error) => {
      setRuntimeError(error instanceof Error ? error.message : String(error));
      setMakeoverStep("brief");
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
  const filteredTargets = useMemo(() => {
    const query = layerSearch.trim().toLowerCase();
    if (!query) {
      return artifactTargets;
    }
    return artifactTargets.filter((target) => [
      target.id,
      target.label,
      target.tagName,
      target.text,
      target.kind
    ].some((value) => value.toLowerCase().includes(query)));
  }, [artifactTargets, layerSearch]);
  const trackedArtifacts = useMemo(() => {
    const resultArtifacts = designResult?.artifacts ?? [];
    if (resultArtifacts.some((artifact) => artifact.path === "DESIGN/index.html")) {
      return resultArtifacts;
    }
    return [
      {
        path: "DESIGN/index.html",
        type: "text/html",
        title: "Editable design artifact",
        description: "Iframe bridge source edited by DESIGN runtime."
      },
      ...resultArtifacts
    ];
  }, [designResult]);

  const commitArtifactPatch = (patch: ArtifactSourcePatch, target: ArtifactEditTarget | null = selectedTarget) => {
    try {
      const nextSource = applyArtifactSourcePatch(artifactSource, patch);
      const entry: ArtifactHistoryEntry = {
        id: crypto.randomUUID(),
        label: patchLabel(patch, target),
        patch,
        beforeSource: artifactSource,
        afterSource: nextSource,
        createdAt: Date.now()
      };
      setSourceHistory((items) => [...items.slice(-24), entry]);
      setRedoHistory([]);
      setArtifactSource(nextSource);
      setSourceDraft(nextSource);
      setArtifactError("");
      if ("id" in patch) {
        setSelectedTarget((currentTarget) => {
          if (!currentTarget || currentTarget.id !== patch.id) {
            return target;
          }
          if (patch.kind === "set-text") {
            return {
              ...currentTarget,
              text: patch.value,
              fields: { ...currentTarget.fields, text: patch.value }
            };
          }
          if (patch.kind === "set-link") {
            return {
              ...currentTarget,
              text: patch.text,
              fields: { ...currentTarget.fields, text: patch.text, href: patch.href }
            };
          }
          if (patch.kind === "set-image") {
            return {
              ...currentTarget,
              fields: { ...currentTarget.fields, src: patch.src, alt: patch.alt },
              attributes: { ...currentTarget.attributes, src: patch.src, alt: patch.alt }
            };
          }
          if (patch.kind === "set-attributes") {
            const attributes = { ...currentTarget.attributes };
            for (const [name, value] of Object.entries(patch.attributes)) {
              if (!value) {
                delete attributes[name];
              } else {
                attributes[name] = value;
              }
            }
            return { ...currentTarget, attributes };
          }
          if (patch.kind === "set-style") {
            return {
              ...currentTarget,
              styles: { ...currentTarget.styles, ...patch.styles }
            };
          }
          if (patch.kind === "set-outer-html") {
            return { ...currentTarget, outerHtml: patch.html };
          }
          return currentTarget;
        });
      }
    } catch (error) {
      setArtifactError(error instanceof Error ? error.message : String(error));
    }
  };

  const undoArtifactChange = () => {
    const entry = sourceHistory.at(-1);
    if (!entry) {
      return;
    }
    setRedoHistory((items) => [entry, ...items.slice(0, 24)]);
    setSourceHistory((items) => items.slice(0, -1));
    setArtifactSource(entry.beforeSource);
    setSourceDraft(entry.beforeSource);
    setSelectedTarget(null);
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
    setSelectedTarget(null);
  };

  const highlightTarget = (target: ArtifactEditTarget) => {
    artifactFrameRef.current?.contentWindow?.postMessage({
      __zeroshotArtifact: true,
      type: "od-highlight-target",
      id: target.id
    }, "*");
  };

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
        setSelectedTarget(message.target);
        setArtifactMode((currentMode) => currentMode === "preview" ? "manual-edit" : currentMode);
      }
      if (message.type === "od-edit-hover" && message.target) {
        highlightTarget(message.target);
      }
      if (message.type === "od-edit-drag") {
        commitArtifactPatch({
          kind: "set-style",
          id: message.target.id,
          styles: {
            transform: translatedStyle(message.target.styles.transform || message.target.attributes.style, message.deltaX, message.deltaY)
          }
        }, message.target);
      }
      if (message.type === "od-edit-key-input") {
        commitArtifactPatch({
          kind: "set-text",
          id: message.target.id,
          value: nextTextFromKey(message.target.fields.text ?? message.target.text, message.key)
        }, message.target);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [artifactSource]);

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  const resources = resourcesQuery.data ?? { skills: [], designTemplates: [], designSystems: [] };
  const hasProductHtml = Boolean(productArtifactQuery.data?.content.trim());
  const hasDesignHtml = Boolean(designArtifactQuery.data?.content.trim());

  const changeDesignTemplate = (nextDesignTemplateId: string) => {
    setActiveDesignTemplateId(nextDesignTemplateId);
    saveSettingsMutation.mutate({ activeSkillId: "", activeDesignTemplateId: nextDesignTemplateId, activeDesignSystemId });
  };

  const changeDesignSystem = (nextDesignSystemId: string) => {
    setActiveDesignSystemId(nextDesignSystemId);
    saveSettingsMutation.mutate({ activeSkillId: "", activeDesignTemplateId, activeDesignSystemId: nextDesignSystemId });
  };

  const runMakeover = (requestedGoal: string) => {
    const nextGoal = requestedGoal.trim();
    if (!nextGoal) {
      return;
    }
    setMode("codex");
    setArtifactError("");
    setRuntimeError("");
    setMakeoverStep("loading");
    designMutation.mutate(nextGoal);
  };

  const applyAttributeDraft = () => {
    if (!selectedTarget) {
      return;
    }
    try {
      const parsed = JSON.parse(attributeDraft) as Record<string, unknown>;
      const attributes = Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, value === null ? "" : String(value)])
      );
      commitArtifactPatch({ kind: "set-attributes", id: selectedTarget.id, attributes }, selectedTarget);
    } catch {
      setArtifactError("Attributes must be valid JSON.");
    }
  };

  const applySelectedTargetAiInstruction = () => {
    if (!aiInstruction.trim()) {
      return;
    }
    const nextGoal = selectedTarget
      ? [
        `Selected target: ${selectedTarget.label} (${selectedTarget.id}, ${selectedTarget.tagName})`,
        "",
        "Current outerHTML:",
        selectedTarget.outerHtml || "(not available)",
        "",
        "Requested design change:",
        aiInstruction.trim()
      ].join("\n")
      : aiInstruction.trim();
    setGoal(nextGoal);
    setMode("codex");
    setArtifactError("");
    runMakeover(nextGoal);
  };

  return (
    <div className={cn("builder-shell design-page", makeoverStep === "workbench" && "design-page-workbench-wide")}>
      <PageHeader title="MAKEOVER" projectRoot={projectRoot} />

      <div className="design-workbench">
        {makeoverStep !== "loading" ? (
          <div className="makeover-step-tabs" role="tablist" aria-label="Makeover pages">
            <Button variant={makeoverStep === "brief" ? "default" : "outline"} onClick={() => setMakeoverStep("brief")}>1. REQUEST</Button>
            <Button variant={makeoverStep === "workbench" ? "default" : "outline"} disabled={!hasDesignHtml} onClick={() => setMakeoverStep("workbench")}>2. DESIGN WORKBENCH</Button>
            <Button variant={makeoverStep === "preview" ? "default" : "outline"} disabled={!designResult} onClick={() => setMakeoverStep("preview")}>3. BRIEF PREVIEW</Button>
          </div>
        ) : null}

        {makeoverStep === "brief" ? (
          <DesignRuntimeSetup
            projectRoot={projectRoot}
            resources={resources}
            designResult={designResult}
            hasProductHtml={hasProductHtml}
            goal={goal}
            setGoal={setGoal}
            activeDesignTemplateId={activeDesignTemplateId}
            activeDesignSystemId={activeDesignSystemId}
            runtimeError={runtimeError}
            timelineItems={timelineItems}
            isRunning={designMutation.isPending}
            isComplete={makeoverComplete}
            onChangeDesignTemplate={changeDesignTemplate}
            onChangeDesignSystem={changeDesignSystem}
            onAutoRun={() => {
              const autoGoal = "알아서 해주세요. 제품 기획서에 가장 잘 맞는 세련된 디자인 방향으로 구성해주세요.";
              setGoal(autoGoal);
              runMakeover(autoGoal);
            }}
            onRun={() => runMakeover(goal)}
          />
        ) : null}

        {makeoverStep === "loading" ? (
          <Card className="makeover-loading-card">
            <AgentLoadingStage label="MAKING OVER" />
            {timelineItems.length ? (
              <div className="design-inline-log" aria-label="Makeover progress">
                {timelineItems.map((item) => (
                  <div key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                ))}
              </div>
            ) : null}
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
            setArtifactMode={setArtifactMode}
            artifactTab={artifactTab}
            setArtifactTab={setArtifactTab}
            artifactViewport={artifactViewport}
            setArtifactViewport={setArtifactViewport}
            artifactZoom={artifactZoom}
            setArtifactZoom={setArtifactZoom}
            trackedArtifacts={trackedArtifacts}
            layerSearch={layerSearch}
            setLayerSearch={setLayerSearch}
            filteredTargets={filteredTargets}
            selectedTarget={selectedTarget}
            setSelectedTarget={setSelectedTarget}
            attributeDraft={attributeDraft}
            setAttributeDraft={setAttributeDraft}
            outerHtmlDraft={outerHtmlDraft}
            setOuterHtmlDraft={setOuterHtmlDraft}
            sourceDraft={sourceDraft}
            setSourceDraft={setSourceDraft}
            aiInstruction={aiInstruction}
            setAiInstruction={setAiInstruction}
            artifactError={artifactError}
            timelineItems={timelineItems}
            sourceHistory={sourceHistory}
            redoHistory={redoHistory}
            isSaving={saveArtifactMutation.isPending}
            onReload={() => {
              void designArtifactQuery.refetch();
              artifactFrameRef.current?.contentWindow?.postMessage({ __zeroshotArtifact: true, type: "od-refresh-targets" }, "*");
            }}
            onHighlightTarget={highlightTarget}
            onCommitPatch={commitArtifactPatch}
            onApplyAttributeDraft={applyAttributeDraft}
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
