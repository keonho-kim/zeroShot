import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchAppSettings, fetchCodexSettings, fetchProjectCodexSettings, saveAppSettings, saveCodexSettings, saveProjectCodexSettings } from "@/lib/api/settings";
import { useAppStore } from "@/store/app-store";
import type { AppConfig, CodexSettings } from "@/types/api";

export function useSettingsPageController() {
  const projectRoot = useAppStore((state) => state.projectRoot);
  const appQuery = useQuery({ queryKey: ["app-settings"], queryFn: fetchAppSettings });
  const codexQuery = useQuery({ queryKey: ["codex-settings"], queryFn: fetchCodexSettings });
  const projectCodexQuery = useQuery({
    queryKey: ["project-codex-settings", projectRoot],
    queryFn: () => fetchProjectCodexSettings(projectRoot),
    enabled: Boolean(projectRoot)
  });
  const [appSettings, setAppSettings] = useState<AppConfig | null>(null);
  const [codexSettings, setCodexSettings] = useState<CodexSettings | null>(null);
  const [projectCodexStatus, setProjectCodexStatus] = useState(projectCodexQuery.data ?? null);

  useEffect(() => {
    if (appQuery.data) {
      setAppSettings(appQuery.data);
    }
  }, [appQuery.data]);
  useEffect(() => {
    if (codexQuery.data) {
      setCodexSettings(codexQuery.data);
    }
  }, [codexQuery.data]);
  useEffect(() => {
    setProjectCodexStatus(projectCodexQuery.data ?? null);
  }, [projectCodexQuery.data]);

  const saveAppMutation = useMutation({
    mutationFn: async () => {
      if (appSettings) {
        await saveAppSettings(appSettings);
      }
    }
  });
  const saveCodexMutation = useMutation({
    mutationFn: async () => {
      if (codexSettings) {
        await saveCodexSettings(codexSettings);
      }
    }
  });
  const saveProjectCodexMutation = useMutation({
    mutationFn: async () => {
      if (!projectRoot) {
        throw new Error("No project selected");
      }
      return saveProjectCodexSettings(projectRoot);
    },
    onSuccess: (status) => setProjectCodexStatus(status)
  });

  const updateCodexDefaults = (next: Partial<CodexSettings["defaults"]>) => {
    if (!codexSettings) {
      return;
    }
    setCodexSettings({
      ...codexSettings,
      defaults: { ...codexSettings.defaults, ...next }
    });
  };

  return {
    appSettings,
    codexSettings,
    projectCodexStatus,
    projectRoot,
    saveAppMutation,
    saveCodexMutation,
    saveProjectCodexMutation,
    setAppSettings,
    setCodexSettings,
    updateCodexDefaults
  };
}
