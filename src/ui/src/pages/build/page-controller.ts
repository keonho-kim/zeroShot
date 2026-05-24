import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { startBuild } from "@/lib/api/pipeline";
import { fetchProjectState } from "@/lib/api/projects";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";

export function useBuildPageController() {
  const { responseLanguage } = useI18n();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setProjectState = useAppStore((state) => state.setProjectState);
  const currentJob = useAppStore((state) => state.currentJob);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const clearLogs = useAppStore((state) => state.clearLogs);

  const stateQuery = useQuery({
    queryKey: ["project-state", projectRoot],
    queryFn: () => fetchProjectState(projectRoot),
    enabled: Boolean(projectRoot)
  });

  useEffect(() => {
    setProjectState(stateQuery.data ?? null);
  }, [setProjectState, stateQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      clearLogs();
      return startBuild({
        projectRoot,
        options: { responseLanguage }
      });
    },
    onSuccess: (job) => {
      setCurrentJob(job);
    }
  });

  const projectState = stateQuery.data;
  return {
    buildJob: currentJob?.mode === "build" ? currentJob : null,
    disabled: !projectRoot || mutation.isPending || !projectState?.buildEnabled,
    mutation,
    projectRoot,
    projectState
  };
}
