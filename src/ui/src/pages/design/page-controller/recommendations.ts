import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { requestDesignRecommendationsStream } from "@/lib/api/design";
import type { DesignRecommendationResponse } from "@/types/api";
import { type DesignTimelineItem, upsertTimelineItem } from "@/pages/design/design-page-model";
import type { MakeoverStep } from "@/pages/design/page-controller/types";

export function useDesignRecommendations(params: {
  projectRoot: string;
  locale: string;
  hasProductHtml: boolean;
  makeoverStep: MakeoverStep;
  setActiveDesignSystemId: (value: string | ((current: string) => string)) => void;
  setActiveDesignTemplateId: (value: string | ((current: string) => string)) => void;
  setActiveDesignSystemSelectionMode: (value: "manual") => void;
  setActiveDesignTemplateSelectionMode: (value: "manual") => void;
}) {
  const [recommendations, setRecommendations] = useState<DesignRecommendationResponse | null>(null);
  const [recommendationTimelineItems, setRecommendationTimelineItems] = useState<DesignTimelineItem[]>([]);
  const [recommendationMessages, setRecommendationMessages] = useState<string[]>([]);
  const [recommendationError, setRecommendationError] = useState("");

  const recommendationMutation = useMutation({
    mutationFn: async () => {
      setRecommendationError("");
      setRecommendationTimelineItems([]);
      setRecommendationMessages([]);
      return requestDesignRecommendationsStream({
        projectRoot: params.projectRoot,
        locale: params.locale
      }, (event) => {
        setRecommendationTimelineItems((items) => upsertTimelineItem(items, event));
      }, undefined, (message) => {
        setRecommendationMessages((items) => items.at(-1) === message ? items : [...items, message]);
      });
    },
    onSuccess: (nextRecommendations) => {
      setRecommendations(nextRecommendations);
      setRecommendationError("");
      params.setActiveDesignSystemId((current) => nextRecommendations.designSystems.some((option) => option.resourceId === current) ? current : "");
      params.setActiveDesignTemplateId((current) => nextRecommendations.designTemplates.some((option) => option.resourceId === current) ? current : "");
      params.setActiveDesignSystemSelectionMode("manual");
      params.setActiveDesignTemplateSelectionMode("manual");
    },
    onError: (error) => {
      setRecommendationError(error instanceof Error ? error.message : String(error));
      setRecommendations(null);
    }
  });

  useEffect(() => {
    if (
      !params.projectRoot ||
      params.makeoverStep !== "brief" ||
      !params.hasProductHtml ||
      recommendations ||
      recommendationMutation.isPending ||
      recommendationError
    ) {
      return;
    }
    recommendationMutation.mutate();
  }, [params.hasProductHtml, params.makeoverStep, params.projectRoot, recommendationError, recommendationMutation, recommendations]);

  const resetRecommendations = () => {
    setRecommendations(null);
    setRecommendationTimelineItems([]);
    setRecommendationMessages([]);
    setRecommendationError("");
  };

  return {
    recommendationError,
    recommendationMessages,
    recommendationMutation,
    recommendationTimelineItems,
    recommendations,
    resetRecommendations,
    setRecommendationError,
    setRecommendations
  };
}
