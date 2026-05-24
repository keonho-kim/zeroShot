import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import type { DesignRuntimeResponse } from "@/types/api";
import { useI18n } from "@/lib/i18n";
import { useDesignArtifactController } from "@/pages/design/page-controller/artifact";
import { useDesignRecommendations } from "@/pages/design/page-controller/recommendations";
import { useDesignResources } from "@/pages/design/page-controller/resources";
import { useDesignRuntimeController } from "@/pages/design/page-controller/runtime";

export function useDesignPageController() {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const [designResult, setDesignResult] = useState<DesignRuntimeResponse | null>(null);

  const resources = useDesignResources(projectRoot, setDesignResult);
  const artifact = useDesignArtifactController({
    projectRoot,
    designArtifactQuery: resources.designArtifactQuery,
    queryClient
  });
  const hasProductHtml = Boolean(resources.productArtifactQuery.data?.content.trim());
  const hasDesignHtml = Boolean(resources.designArtifactQuery.data?.content.trim());

  const runtime = useDesignRuntimeController({
    activeDesignSystemId: resources.activeDesignSystemId,
    activeDesignTemplateId: resources.activeDesignTemplateId,
    aiInstruction: artifact.aiInstruction,
    artifactSource: artifact.artifactSource,
    commentCapture: artifact.commentCapture,
    hasDesignHtml,
    productHtml: resources.productArtifactQuery.data?.content ?? "",
    projectRoot,
    locale,
    queryClient,
    selectedTargets: artifact.selectedTargets,
    setAiInstruction: artifact.setAiInstruction,
    setArtifactChatMessages: artifact.setArtifactChatMessages,
    setArtifactError: artifact.setArtifactError,
    setArtifactMode: artifact.setArtifactMode,
    setArtifactSource: artifact.setArtifactSource,
    setCommentCapture: artifact.setCommentCapture,
    setCommentToolOpen: artifact.setCommentToolOpen,
    setDesignResult,
    setSourceDraft: artifact.setSourceDraft,
    t
  });

  const recommendations = useDesignRecommendations({
    projectRoot,
    locale,
    hasProductHtml,
    makeoverStep: runtime.makeoverStep,
    setActiveDesignSystemId: resources.setActiveDesignSystemId,
    setActiveDesignTemplateId: resources.setActiveDesignTemplateId,
    setActiveDesignSystemSelectionMode: resources.setActiveDesignSystemSelectionMode,
    setActiveDesignTemplateSelectionMode: resources.setActiveDesignTemplateSelectionMode
  });

  useEffect(() => {
    setDesignResult(null);
    recommendations.resetRecommendations();
    resources.resetSelectionModes();
    artifact.resetArtifactMode();
  }, [projectRoot]);

  return {
    activeDesignSystemId: resources.activeDesignSystemId,
    activeDesignSystemSelectionMode: resources.activeDesignSystemSelectionMode,
    activeDesignTemplateId: resources.activeDesignTemplateId,
    activeDesignTemplateSelectionMode: resources.activeDesignTemplateSelectionMode,
    aiInstruction: artifact.aiInstruction,
    applySelectedTargetAiInstruction: runtime.applySelectedTargetAiInstruction,
    artifactChatMessages: artifact.artifactChatMessages,
    artifactError: artifact.artifactError,
    artifactFrameRef: artifact.artifactFrameRef,
    artifactMode: artifact.artifactMode,
    artifactSource: artifact.artifactSource,
    artifactSrcDoc: artifact.artifactSrcDoc,
    artifactViewport: artifact.artifactViewport,
    artifactZoom: artifact.artifactZoom,
    changeDesignSystem: resources.changeDesignSystem,
    changeDesignTemplate: resources.changeDesignTemplate,
    commentCapture: artifact.commentCapture,
    commentToolOpen: artifact.commentToolOpen,
    designArtifactQuery: resources.designArtifactQuery,
    designMutation: runtime.designMutation,
    designResult,
    goal: runtime.goal,
    hasDesignHtml,
    hasProductHtml,
    makeoverComplete: runtime.makeoverComplete,
    makeoverStep: runtime.makeoverStep,
    projectRoot,
    recommendationError: recommendations.recommendationError,
    recommendationMessages: recommendations.recommendationMessages,
    recommendationMutation: recommendations.recommendationMutation,
    recommendationTimelineItems: recommendations.recommendationTimelineItems,
    recommendations: recommendations.recommendations,
    redoArtifactChange: artifact.redoArtifactChange,
    redoHistory: artifact.redoHistory,
    resources: resources.resources,
    runMakeover: runtime.runMakeover,
    runtimeError: runtime.runtimeError,
    runtimeMessages: runtime.runtimeMessages,
    saveArtifactMutation: artifact.saveArtifactMutation,
    selectedTargets: artifact.selectedTargets,
    setAiInstruction: artifact.setAiInstruction,
    setArtifactViewport: artifact.setArtifactViewport,
    setArtifactZoom: artifact.setArtifactZoom,
    setCommentCapture: artifact.setCommentCapture,
    setCommentToolOpen: artifact.setCommentToolOpen,
    setGoal: runtime.setGoal,
    setMakeoverStep: runtime.setMakeoverStep,
    setRecommendationError: recommendations.setRecommendationError,
    setRecommendations: recommendations.setRecommendations,
    setSelectedTargetIds: artifact.setSelectedTargetIds,
    setSourceDraft: artifact.setSourceDraft,
    sourceDraft: artifact.sourceDraft,
    sourceHistory: artifact.sourceHistory,
    timelineItems: runtime.timelineItems,
    undoArtifactChange: artifact.undoArtifactChange
  };
}
