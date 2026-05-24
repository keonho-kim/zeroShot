import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchLatestDesign } from "@/lib/api/design";
import {
  fetchDesignArtifact,
  fetchProductArtifact,
  fetchProjectSettings,
  saveProjectSettings
} from "@/lib/api/projects";
import { fetchResources } from "@/lib/api/resources";
import type { DesignResourceSelectionMode, DesignResultSetter } from "@/pages/design/page-controller/types";

export function useDesignResources(projectRoot: string, setDesignResult: DesignResultSetter) {
  const [activeDesignTemplateId, setActiveDesignTemplateId] = useState("");
  const [activeDesignSystemId, setActiveDesignSystemId] = useState("");
  const [activeDesignTemplateSelectionMode, setActiveDesignTemplateSelectionMode] = useState<DesignResourceSelectionMode>("manual");
  const [activeDesignSystemSelectionMode, setActiveDesignSystemSelectionMode] = useState<DesignResourceSelectionMode>("manual");

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
  }, [latestDesignQuery.data, setDesignResult]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (next: { activeSkillId: string; activeDesignTemplateId: string; activeDesignSystemId: string }) => saveProjectSettings({
      projectRoot,
      activeSkillId: next.activeSkillId || undefined,
      activeDesignTemplateId: next.activeDesignTemplateId || undefined,
      activeDesignSystemId: next.activeDesignSystemId || undefined
    })
  });

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

  const resetSelectionModes = () => {
    setActiveDesignTemplateSelectionMode("manual");
    setActiveDesignSystemSelectionMode("manual");
  };

  return {
    activeDesignSystemId,
    activeDesignSystemSelectionMode,
    activeDesignTemplateId,
    activeDesignTemplateSelectionMode,
    changeDesignSystem,
    changeDesignTemplate,
    designArtifactQuery,
    latestDesignQuery,
    productArtifactQuery,
    resetSelectionModes,
    resources: resourcesQuery.data ?? { skills: [], designTemplates: [], designSystems: [] },
    resourcesQuery,
    saveSettingsMutation,
    setActiveDesignSystemId,
    setActiveDesignSystemSelectionMode,
    setActiveDesignTemplateId,
    setActiveDesignTemplateSelectionMode,
    settingsQuery
  };
}
