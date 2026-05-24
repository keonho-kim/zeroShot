import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { allUpdateDecisionsAnswered, composeUpdateContent, selectedUpdateOption } from "@/entities/update/update-decisions";
import { requestUpdateDecisionsStream, startUpdate } from "@/lib/api/update";
import { fetchProjectState } from "@/lib/api/projects";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import type { UpdateDecisionResponse, UpdateProgressEvent } from "@/types/api";

export function useUpdatePageController() {
  const { locale, t, responseLanguage } = useI18n();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setProjectState = useAppStore((state) => state.setProjectState);
  const currentJob = useAppStore((state) => state.currentJob);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const clearLogs = useAppStore((state) => state.clearLogs);
  const [updateContent, setUpdateContent] = useState("");
  const [decisionSet, setDecisionSet] = useState<UpdateDecisionResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [isGeneratingDecisions, setIsGeneratingDecisions] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [progressItems, setProgressItems] = useState<UpdateProgressEvent[]>([]);
  const [streamMessages, setStreamMessages] = useState<string[]>([]);

  const stateQuery = useQuery({
    queryKey: ["project-state", projectRoot],
    queryFn: () => fetchProjectState(projectRoot),
    enabled: Boolean(projectRoot)
  });

  useEffect(() => {
    setProjectState(stateQuery.data ?? null);
  }, [setProjectState, stateQuery.data]);

  useEffect(() => {
    setDecisionSet(null);
    setAnswers({});
    setStepIndex(0);
    setDecisionError("");
    setProgressItems([]);
    setStreamMessages([]);
  }, [projectRoot]);

  const decisions = decisionSet?.decisions ?? [];
  const currentDecision = decisions[stepIndex];
  const canStartUpdate = decisionSet !== null && allUpdateDecisionsAnswered(decisions, answers);
  const pinnedChoices = useMemo(() => decisions.slice(0, stepIndex).map((decision) => ({
    decision,
    option: selectedUpdateOption(answers, decision)
  })), [answers, decisions, stepIndex]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!decisionSet || !canStartUpdate) {
        throw new Error(t("update.decisionsRequired"));
      }
      clearLogs();
      return startUpdate({
        projectRoot,
        updateContent: composeUpdateContent({ request: updateContent, decisionSet, answers }),
        updateRequest: updateContent,
        updateDecisionSet: decisionSet,
        updateAnswers: answers,
        options: { responseLanguage }
      });
    },
    onSuccess: (job) => {
      setCurrentJob(job);
    }
  });

  async function requestDecisions() {
    if (!updateContent.trim()) {
      return;
    }
    setIsGeneratingDecisions(true);
    setDecisionError("");
    setDecisionSet(null);
    setAnswers({});
    setStepIndex(0);
    setProgressItems([]);
    setStreamMessages([]);
    try {
      const nextDecisionSet = await requestUpdateDecisionsStream(
        { projectRoot, updateRequest: updateContent.trim(), locale },
        (event) => setProgressItems((items) => [...items.filter((item) => item.id !== event.id), event]),
        undefined,
        (message) => setStreamMessages((messages) => messages.at(-1) === message ? messages : [...messages, message])
      );
      setDecisionSet(nextDecisionSet);
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGeneratingDecisions(false);
    }
  }

  const projectState = stateQuery.data;
  const updateDisabled = !projectState?.updateEnabled || isGeneratingDecisions || !updateContent.trim();
  const disabledReason = projectState
    ? projectState.runsCount < 1
      ? t("update.needsBuild")
      : t("update.noSourceToUpdate")
    : t("app.loadingAuth");

  return {
    answers,
    canStartUpdate,
    currentDecision,
    decisionError,
    decisionSet,
    decisions,
    disabledReason,
    isGeneratingDecisions,
    mutation,
    pinnedChoices,
    progressItems,
    projectRoot,
    projectState,
    requestDecisions,
    setAnswers,
    setStepIndex,
    setUpdateContent,
    stepIndex,
    streamMessages,
    updateContent,
    updateDisabled,
    updateJob: currentJob?.mode === "update" ? currentJob : null
  };
}
