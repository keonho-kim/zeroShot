import type { Dispatch, RefObject, SetStateAction } from "react";
import type {
  ArtifactEditorMode,
  ArtifactEditorTab,
  ArtifactEditTarget,
  ArtifactHistoryEntry,
  ArtifactSourcePatch
} from "@/entities/design/artifact-editor";
import type { DesignRuntimeResponse } from "@/types/api";
import type { DesignTimelineItem } from "@/pages/design/design-page-model";

export type ArtifactViewport = "desktop" | "tablet" | "mobile";

export type CommitArtifactPatch = (patch: ArtifactSourcePatch, target?: ArtifactEditTarget | null) => void;

export interface ArtifactCommentCapture {
  cleanImage: string;
  annotatedImage: string;
  note: string;
  targetIds: string[];
  createdAt: number;
}

export interface ArtifactWorkbenchProps {
  hasProductHtml: boolean;
  artifactEtag?: string;
  artifactUpdatedAt?: string;
  artifactFrameRef: RefObject<HTMLIFrameElement | null>;
  artifactSrcDoc: string;
  artifactMode: ArtifactEditorMode;
  setArtifactMode: Dispatch<SetStateAction<ArtifactEditorMode>>;
  artifactTab: ArtifactEditorTab;
  setArtifactTab: Dispatch<SetStateAction<ArtifactEditorTab>>;
  artifactViewport: ArtifactViewport;
  setArtifactViewport: Dispatch<SetStateAction<ArtifactViewport>>;
  artifactZoom: number;
  setArtifactZoom: Dispatch<SetStateAction<number>>;
  trackedArtifacts: DesignRuntimeResponse["artifacts"];
  layerSearch: string;
  setLayerSearch: Dispatch<SetStateAction<string>>;
  filteredTargets: ArtifactEditTarget[];
  selectedTarget: ArtifactEditTarget | null;
  setSelectedTarget: Dispatch<SetStateAction<ArtifactEditTarget | null>>;
  selectedTargets: ArtifactEditTarget[];
  selectedTargetIds: string[];
  onToggleTargetSelection: (target: ArtifactEditTarget) => void;
  onClearTargetSelection: () => void;
  attributeDraft: string;
  setAttributeDraft: Dispatch<SetStateAction<string>>;
  outerHtmlDraft: string;
  setOuterHtmlDraft: Dispatch<SetStateAction<string>>;
  sourceDraft: string;
  setSourceDraft: Dispatch<SetStateAction<string>>;
  aiInstruction: string;
  setAiInstruction: Dispatch<SetStateAction<string>>;
  commentCapture: ArtifactCommentCapture | null;
  artifactError: string;
  timelineItems: DesignTimelineItem[];
  sourceHistory: ArtifactHistoryEntry[];
  redoHistory: ArtifactHistoryEntry[];
  isSaving: boolean;
  onReload: () => void;
  onHighlightTarget: (target: ArtifactEditTarget) => void;
  onOpenCommentTool: () => void;
  onRemoveCommentCapture: () => void;
  onCommitPatch: CommitArtifactPatch;
  onApplyAttributeDraft: () => void;
  onApplySelectedTargetAiInstruction: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
}
