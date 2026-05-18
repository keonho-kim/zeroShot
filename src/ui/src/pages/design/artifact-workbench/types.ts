import type { Dispatch, RefObject, SetStateAction } from "react";
import type {
  ArtifactEditorMode,
  ArtifactEditTarget,
  ArtifactHistoryEntry,
} from "@/entities/design/artifact-editor";
import type { DesignTimelineItem } from "@/pages/design/design-page-model";

export type ArtifactViewport = "desktop" | "tablet" | "mobile";

export interface ArtifactCommentCapture {
  cleanImage: string;
  annotatedImage: string;
  note: string;
  targetIds: string[];
  createdAt: number;
}

export interface ArtifactChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  mentions: string[];
  hasCommentCapture: boolean;
  progress: DesignTimelineItem[];
  isStreaming?: boolean;
}

export interface ArtifactWorkbenchProps {
  hasProductHtml: boolean;
  artifactEtag?: string;
  artifactUpdatedAt?: string;
  artifactFrameRef: RefObject<HTMLIFrameElement | null>;
  artifactSrcDoc: string;
  artifactMode: ArtifactEditorMode;
  artifactViewport: ArtifactViewport;
  setArtifactViewport: Dispatch<SetStateAction<ArtifactViewport>>;
  artifactZoom: number;
  setArtifactZoom: Dispatch<SetStateAction<number>>;
  sourceDraft: string;
  setSourceDraft: Dispatch<SetStateAction<string>>;
  aiInstruction: string;
  setAiInstruction: Dispatch<SetStateAction<string>>;
  selectedTargets: ArtifactEditTarget[];
  commentCapture: ArtifactCommentCapture | null;
  chatMessages: ArtifactChatMessage[];
  isRunning: boolean;
  artifactError: string;
  sourceHistory: ArtifactHistoryEntry[];
  redoHistory: ArtifactHistoryEntry[];
  isSaving: boolean;
  onReload: () => void;
  commentToolOpen: boolean;
  onOpenCommentTool: () => void;
  onCloseCommentTool: () => void;
  onCaptureComment: (capture: ArtifactCommentCapture) => void;
  onRemoveCommentCapture: () => void;
  onClearTargetSelection: () => void;
  onApplySelectedTargetAiInstruction: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
}
