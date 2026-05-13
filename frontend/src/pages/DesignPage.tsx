import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/stores/app-store";
import {
  fetchLatestDesign,
  fetchProductArtifact,
  fetchProjectSettings,
  fetchResources,
  requestDesignRuntimeStream,
  saveProductArtifact,
  saveProjectSettings
} from "@/lib/api";
import type { DesignRuntimeMode, DesignRuntimeResponse } from "@/types/api";
import { blueprintToProductMarkdown } from "@/entities/architect/architect-core";
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
import { DesignTimeline } from "@/pages/design/DesignTimeline";
import { type DesignTimelineItem, upsertTimelineItem } from "@/pages/design/design-page-model";

export function DesignPage() {
  const queryClient = useQueryClient();
  const artifactFrameRef = useRef<HTMLIFrameElement>(null);
  const projectRoot = useAppStore((state) => state.projectRoot);
  const locale = useMemo(() => navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en", []);
  const [mode, setMode] = useState<DesignRuntimeMode>("codex");
  const [goal, setGoal] = useState("");
  const [activeSkillId, setActiveSkillId] = useState("");
  const [activeDesignTemplateId, setActiveDesignTemplateId] = useState("");
  const [timelineItems, setTimelineItems] = useState<DesignTimelineItem[]>([]);
  const [runtimeError, setRuntimeError] = useState("");
  const [designResult, setDesignResult] = useState<DesignRuntimeResponse | null>(null);
  const [artifactMode, setArtifactMode] = useState<ArtifactEditorMode>("manual-edit");
  const [artifactTab, setArtifactTab] = useState<ArtifactEditorTab>("content");
  const [artifactViewport, setArtifactViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [artifactZoom, setArtifactZoom] = useState(0.85);
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
  const latestDesignQuery = useQuery({
    queryKey: ["design-latest", projectRoot],
    queryFn: () => fetchLatestDesign(projectRoot),
    enabled: Boolean(projectRoot)
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }
    setActiveSkillId(settingsQuery.data.activeSkillId ?? "");
    setActiveDesignTemplateId(settingsQuery.data.activeDesignTemplateId ?? "");
  }, [settingsQuery.data]);

  useEffect(() => {
    setDesignResult(latestDesignQuery.data ?? null);
  }, [latestDesignQuery.data]);

  useEffect(() => {
    setArtifactSource(productArtifactQuery.data?.content.trim() ? productArtifactQuery.data.content : "");
    setArtifactEtag(productArtifactQuery.data?.etag ?? "");
    setArtifactTargets([]);
    setSelectedTarget(null);
    setSourceHistory([]);
    setRedoHistory([]);
    setArtifactError("");
    setSourceDraft(productArtifactQuery.data?.content.trim() ? productArtifactQuery.data.content : "");
  }, [productArtifactQuery.data, projectRoot]);

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
    mutationFn: async (next: { activeSkillId: string; activeDesignTemplateId: string }) => saveProjectSettings({
      projectRoot,
      activeSkillId: next.activeSkillId || undefined,
      activeDesignTemplateId: next.activeDesignTemplateId || undefined
    })
  });

  const designMutation = useMutation({
    mutationFn: async () => {
      if (!productArtifactQuery.data?.content.trim()) {
        throw new Error("PRODUCT BLUEPRINT를 먼저 만들어야 DESIGN을 실행할 수 있습니다.");
      }
      setRuntimeError("");
      setTimelineItems([]);
      return requestDesignRuntimeStream({
        projectRoot,
        mode,
        goal,
        locale,
        activeSkillId: activeSkillId || undefined,
        activeDesignTemplateId: activeDesignTemplateId || undefined
      }, (event) => {
        setTimelineItems((items) => upsertTimelineItem(items, event));
      });
    },
    onSuccess: (design) => {
      setDesignResult(design);
      setTimelineItems([]);
      void queryClient.invalidateQueries({ queryKey: ["design-latest", projectRoot] });
      void queryClient.invalidateQueries({ queryKey: ["project-state", projectRoot] });
    },
    onError: (error) => {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }
  });

  const saveArtifactMutation = useMutation({
    mutationFn: async () => saveProductArtifact({
      projectRoot,
      content: artifactSource,
      markdownMirror: blueprintToProductMarkdown(artifactSource),
      etag: artifactEtag
    }),
    onSuccess: (file) => {
      setArtifactEtag(file.etag);
      setArtifactSource(file.content);
      setSourceDraft(file.content);
      void queryClient.invalidateQueries({ queryKey: ["product-artifact", projectRoot] });
      void queryClient.invalidateQueries({ queryKey: ["product-html", projectRoot] });
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
    if (resultArtifacts.some((artifact) => artifact.path === "PRODUCT.html")) {
      return resultArtifacts;
    }
    return [
      {
        path: "PRODUCT.html",
        type: "text/html",
        title: "Editable product artifact",
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

  const resources = resourcesQuery.data ?? { skills: [], designTemplates: [] };
  const hasProductHtml = Boolean(productArtifactQuery.data?.content.trim());

  const changeSkill = (nextSkillId: string) => {
    setActiveSkillId(nextSkillId);
    saveSettingsMutation.mutate({ activeSkillId: nextSkillId, activeDesignTemplateId });
  };

  const changeDesignTemplate = (nextDesignTemplateId: string) => {
    setActiveDesignTemplateId(nextDesignTemplateId);
    saveSettingsMutation.mutate({ activeSkillId, activeDesignTemplateId: nextDesignTemplateId });
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
    if (!selectedTarget || !aiInstruction.trim()) {
      return;
    }
    setGoal([
      `Selected target: ${selectedTarget.label} (${selectedTarget.id}, ${selectedTarget.tagName})`,
      "",
      "Current outerHTML:",
      selectedTarget.outerHtml || "(not available)",
      "",
      "Requested design change:",
      aiInstruction.trim()
    ].join("\n"));
    setMode("codex");
    setArtifactError("");
  };

  return (
    <div className="builder-shell design-page">
      <PageHeader title="DESIGN" projectRoot={projectRoot} />

      <div className="design-workbench">
        <DesignRuntimeSetup
          projectRoot={projectRoot}
          resources={resources}
          designResult={designResult}
          hasProductHtml={hasProductHtml}
          mode={mode}
          setMode={setMode}
          goal={goal}
          setGoal={setGoal}
          activeSkillId={activeSkillId}
          activeDesignTemplateId={activeDesignTemplateId}
          runtimeError={runtimeError}
          isRunning={designMutation.isPending}
          onChangeSkill={changeSkill}
          onChangeDesignTemplate={changeDesignTemplate}
          onRun={() => designMutation.mutate()}
        />

        <div className="design-editor-grid">
          <ArtifactWorkbench
            hasProductHtml={hasProductHtml}
            artifactEtag={productArtifactQuery.data?.etag}
            artifactUpdatedAt={productArtifactQuery.data?.updatedAt}
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
            sourceHistory={sourceHistory}
            redoHistory={redoHistory}
            isSaving={saveArtifactMutation.isPending}
            onReload={() => {
              void productArtifactQuery.refetch();
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
        </div>

        <DesignTimeline items={timelineItems} />

        {designResult ? <DesignResult design={designResult} /> : null}
      </div>
    </div>
  );
}
