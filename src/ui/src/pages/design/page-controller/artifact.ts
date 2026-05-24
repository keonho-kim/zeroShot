import { type QueryClient, type UseQueryResult, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { isArtifactBridgeMessage } from "@/entities/design/artifact-editor/bridge-message";
import { buildArtifactSrcDoc } from "@/entities/design/artifact-editor/srcdoc";
import type { ArtifactBridgeMessage, ArtifactEditorMode, ArtifactEditTarget, ArtifactHistoryEntry } from "@/entities/design/artifact-editor/types";
import { saveDesignArtifact } from "@/lib/api/projects";
import type { ProductArtifactFile } from "@/types/api";
import type { ArtifactChatMessage, ArtifactCommentCapture } from "@/pages/design/artifact-workbench/types";

export function useDesignArtifactController(params: {
  projectRoot: string;
  designArtifactQuery: UseQueryResult<ProductArtifactFile, Error>;
  queryClient: QueryClient;
}) {
  const artifactFrameRef = useRef<HTMLIFrameElement>(null);
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

  useEffect(() => {
    setArtifactSource(params.designArtifactQuery.data?.content.trim() ? params.designArtifactQuery.data.content : "");
    setArtifactEtag(params.designArtifactQuery.data?.etag ?? "");
    setArtifactTargets([]);
    setSelectedTargetIds([]);
    setSourceHistory([]);
    setRedoHistory([]);
    setArtifactError("");
    setSourceDraft(params.designArtifactQuery.data?.content.trim() ? params.designArtifactQuery.data.content : "");
  }, [params.designArtifactQuery.data, params.projectRoot]);

  useEffect(() => {
    artifactFrameRef.current?.contentWindow?.postMessage({
      __zeroshotArtifact: true,
      type: "od-edit-mode",
      mode: artifactMode
    }, "*");
  }, [artifactMode]);

  const saveArtifactMutation = useMutation({
    mutationFn: async () => saveDesignArtifact({
      projectRoot: params.projectRoot,
      content: artifactSource,
      etag: artifactEtag
    }),
    onSuccess: (file) => {
      setArtifactEtag(file.etag);
      setArtifactSource(file.content);
      setSourceDraft(file.content);
      void params.queryClient.invalidateQueries({ queryKey: ["design-artifact", params.projectRoot] });
      void params.queryClient.invalidateQueries({ queryKey: ["project-state", params.projectRoot] });
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

  const resetArtifactMode = () => {
    setArtifactMode("preview");
  };

  return {
    aiInstruction,
    artifactChatMessages,
    artifactError,
    artifactFrameRef,
    artifactMode,
    artifactSource,
    artifactSrcDoc,
    artifactViewport,
    artifactZoom,
    commentCapture,
    commentToolOpen,
    redoArtifactChange,
    redoHistory,
    resetArtifactMode,
    saveArtifactMutation,
    selectedTargetIds,
    selectedTargets,
    setAiInstruction,
    setArtifactChatMessages,
    setArtifactError,
    setArtifactMode,
    setArtifactSource,
    setArtifactViewport,
    setArtifactZoom,
    setCommentCapture,
    setCommentToolOpen,
    setRedoHistory,
    setSelectedTargetIds,
    setSourceDraft,
    setSourceHistory,
    sourceDraft,
    sourceHistory,
    undoArtifactChange
  };
}
