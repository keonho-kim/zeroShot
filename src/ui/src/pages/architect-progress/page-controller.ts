import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  allDecisionsAnswered,
  firstRoundEndIndex,
  selectedOption
} from "@/entities/architect/architect-core";
import { clearMissingProjectSelection, hasValidSelectedProject, isMissingSelectedProjectError } from "@/entities/project/stale-project";
import {
  createArchitectProductHtmlStream,
  requestArchitectDecisionsStream,
  runArchitectBootstrap
} from "@/lib/api/architect";
import { fetchProjectSettings, fetchProjectState } from "@/lib/api/projects";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import { useArchitectFlowStore } from "@/store/architect-store";
import { bootstrapLanguageSummary } from "@/pages/architect-progress/bootstrap-summary";

export function useArchitectProgressController() {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setProjectRoot = useAppStore((state) => state.setProjectRoot);
  const setProjectState = useAppStore((state) => state.setProjectState);
  const setCandidateProjectPath = useAppStore((state) => state.setCandidateProjectPath);
  const setSelectedBrowserEntryPath = useAppStore((state) => state.setSelectedBrowserEntryPath);
  const setProjectPickerOpen = useAppStore((state) => state.setProjectPickerOpen);
  const setArchitectProductContent = useAppStore((state) => state.setArchitectProductContent);
  const requestKey = useArchitectFlowStore((state) => state.requestKey);
  const startedRequestKey = useArchitectFlowStore((state) => state.startedRequestKey);
  const userBrief = useArchitectFlowStore((state) => state.userBrief);
  const submittedBrief = useArchitectFlowStore((state) => state.submittedBrief);
  const omakaseMode = useArchitectFlowStore((state) => state.omakaseMode);
  const decisionSet = useArchitectFlowStore((state) => state.decisionSet);
  const stepIndex = useArchitectFlowStore((state) => state.stepIndex);
  const answers = useArchitectFlowStore((state) => state.answers);
  const blueprintHtml = useArchitectFlowStore((state) => state.blueprintHtml);
  const blueprintReady = useArchitectFlowStore((state) => state.blueprintReady);
  const blueprintOpen = useArchitectFlowStore((state) => state.blueprintOpen);
  const tutorialOpen = useArchitectFlowStore((state) => state.tutorialOpen);
  const continuePromptOpen = useArchitectFlowStore((state) => state.continuePromptOpen);
  const architectError = useArchitectFlowStore((state) => state.architectError);
  const timelineItems = useArchitectFlowStore((state) => state.timelineItems);
  const streamMessages = useArchitectFlowStore((state) => state.streamMessages);
  const blueprintTimelineItems = useArchitectFlowStore((state) => state.blueprintTimelineItems);
  const blueprintStreamMessages = useArchitectFlowStore((state) => state.blueprintStreamMessages);
  const markRequestStarted = useArchitectFlowStore((state) => state.markRequestStarted);
  const addProgress = useArchitectFlowStore((state) => state.addProgress);
  const addStreamMessage = useArchitectFlowStore((state) => state.addStreamMessage);
  const resetBlueprintStream = useArchitectFlowStore((state) => state.resetBlueprintStream);
  const addBlueprintProgress = useArchitectFlowStore((state) => state.addBlueprintProgress);
  const addBlueprintStreamMessage = useArchitectFlowStore((state) => state.addBlueprintStreamMessage);
  const completeRequest = useArchitectFlowStore((state) => state.completeRequest);
  const failRequest = useArchitectFlowStore((state) => state.failRequest);
  const chooseOption = useArchitectFlowStore((state) => state.chooseOption);
  const setStepIndex = useArchitectFlowStore((state) => state.setStepIndex);
  const setBlueprintHtml = useArchitectFlowStore((state) => state.setBlueprintHtml);
  const setBlueprintReady = useArchitectFlowStore((state) => state.setBlueprintReady);
  const setBlueprintOpen = useArchitectFlowStore((state) => state.setBlueprintOpen);
  const setTutorialOpen = useArchitectFlowStore((state) => state.setTutorialOpen);
  const setContinuePromptOpen = useArchitectFlowStore((state) => state.setContinuePromptOpen);

  const projectStateQuery = useQuery({
    queryKey: ["project-state", projectRoot],
    queryFn: () => fetchProjectState(projectRoot),
    enabled: Boolean(projectRoot),
    retry: (failureCount, error) => !isMissingSelectedProjectError(error) && failureCount < 3
  });

  const projectSettingsQuery = useQuery({
    queryKey: ["project-settings", projectRoot],
    queryFn: () => fetchProjectSettings(projectRoot),
    enabled: hasValidSelectedProject(projectRoot, projectStateQuery.data),
    retry: (failureCount, error) => !isMissingSelectedProjectError(error) && failureCount < 3
  });

  const activeSkillId = projectSettingsQuery.data?.activeSkillId ?? "";
  const activeDesignTemplateId = projectSettingsQuery.data?.activeDesignTemplateId ?? "";
  const activeDesignSystemId = projectSettingsQuery.data?.activeDesignSystemId ?? "";
  const decisions = decisionSet?.decisions ?? [];
  const currentDecision = decisions[stepIndex];
  const isComplete = decisionSet !== null && stepIndex >= decisions.length;
  const currentSelection = currentDecision ? answers[currentDecision.id] : "";
  const pinnedChoices = decisionSet
    ? decisions.slice(0, Math.min(stepIndex, decisions.length)).map((decision) => ({
      decision,
      option: selectedOption(answers, decision)
    })).filter((item) => item.option)
    : [];
  const canCreateBlueprint = decisionSet !== null && allDecisionsAnswered(decisions, answers);
  const roundOneEndIndex = decisionSet ? firstRoundEndIndex(decisions) : -1;
  const roundOneDecision = decisions[roundOneEndIndex];
  const roundOneSelection = roundOneDecision ? answers[roundOneDecision.id] : "";

  const createBlueprintMutation = useMutation({
    mutationFn: async () => {
      if (!decisionSet || !canCreateBlueprint) {
        throw new Error("Architect decisions are required before a product blueprint can be created.");
      }
      resetBlueprintStream();
      return createArchitectProductHtmlStream(
        {
          projectRoot,
          userBrief: submittedBrief || userBrief,
          decisionSet,
          answers,
          locale,
          activeSkillId: activeSkillId || undefined,
          activeDesignTemplateId: activeDesignTemplateId || undefined,
          activeDesignSystemId: activeDesignSystemId || undefined
        },
        addBlueprintProgress,
        undefined,
        addBlueprintStreamMessage
      );
    },
    onSuccess: (file) => {
      setBlueprintHtml(file.content);
      setArchitectProductContent(file.content);
      setBlueprintReady(true);
      setContinuePromptOpen(true);
    }
  });

  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      if (!decisionSet) {
        throw new Error("Architect decisions are required before bootstrap.");
      }
      if (!hasValidSelectedProject(projectRoot, projectStateQuery.data)) {
        throw new Error("A valid selected project is required before bootstrap.");
      }
      return runArchitectBootstrap({
        projectRoot,
        answers,
        decisions: decisions.slice(0, roundOneEndIndex + 1)
      });
    }
  });

  const bootstrapSummary = bootstrapMutation.data ? bootstrapLanguageSummary(bootstrapMutation.data.args) : null;

  const selectDecisionOption = (optionId: string) => {
    if (!currentDecision) {
      return;
    }
    if (stepIndex <= roundOneEndIndex && optionId !== currentSelection && (bootstrapMutation.isSuccess || bootstrapMutation.isError)) {
      bootstrapMutation.reset();
    }
    chooseOption(currentDecision.id, optionId);
  };

  const goNext = () => {
    if (!decisionSet) {
      return;
    }
    if (stepIndex === roundOneEndIndex && roundOneSelection && !bootstrapMutation.isSuccess) {
      if (!bootstrapMutation.isPending) {
        bootstrapMutation.mutate(undefined, {
          onSuccess: () => setStepIndex((value) => Math.min(decisions.length, value + 1))
        });
      }
      return;
    }
    if (stepIndex + 1 >= decisions.length) {
      setStepIndex(decisions.length);
      if (!blueprintReady && !createBlueprintMutation.isPending) {
        createBlueprintMutation.mutate();
      } else if (blueprintReady) {
        setContinuePromptOpen(true);
      }
      return;
    }
    setStepIndex((value) => value + 1);
  };

  const closeBlueprint = () => {
    setBlueprintOpen(false);
    setContinuePromptOpen(true);
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data === "zeroshot:blueprint-end") {
        setContinuePromptOpen(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setContinuePromptOpen]);

  useEffect(() => {
    if (!projectRoot || (!isMissingSelectedProjectError(projectStateQuery.error) && !isMissingSelectedProjectError(projectSettingsQuery.error))) {
      return;
    }
    clearMissingProjectSelection({
      setProjectRoot,
      setProjectState,
      setCandidateProjectPath,
      setSelectedBrowserEntryPath,
      setProjectPickerOpen
    });
  }, [
    projectRoot,
    projectSettingsQuery.error,
    projectStateQuery.error,
    setCandidateProjectPath,
    setProjectPickerOpen,
    setProjectRoot,
    setProjectState,
    setSelectedBrowserEntryPath
  ]);

  useEffect(() => {
    if (!projectRoot || !userBrief.trim() || !requestKey || projectSettingsQuery.isLoading || projectSettingsQuery.isError) {
      return;
    }
    if (projectStateQuery.isLoading || projectStateQuery.isError || !hasValidSelectedProject(projectRoot, projectStateQuery.data)) {
      return;
    }
    if (startedRequestKey === requestKey || decisionSet) {
      return;
    }

    markRequestStarted(requestKey);
    void requestArchitectDecisionsStream(
      {
        projectRoot,
        goal: [
          userBrief.trim(),
          "",
          omakaseMode
            ? "Omakase mode is enabled. Simulate the full architect conversation: generate the questions, choose the recommended answer for each question yourself, and make every first option the answer you would actually pick for this product."
            : "Guided mode is enabled. The user will answer each round question manually."
        ].join("\n"),
        locale,
        activeSkillId: activeSkillId || undefined,
        activeDesignTemplateId: activeDesignTemplateId || undefined,
        activeDesignSystemId: activeDesignSystemId || undefined
      },
      addProgress,
      undefined,
      addStreamMessage
    ).then((nextDecisionSet) => {
      completeRequest(nextDecisionSet);
    }).catch((error: unknown) => {
      failRequest(error instanceof Error ? error.message : String(error));
    });
  }, [
    activeDesignTemplateId,
    activeDesignSystemId,
    activeSkillId,
    addProgress,
    addStreamMessage,
    completeRequest,
    decisionSet,
    failRequest,
    locale,
    markRequestStarted,
    omakaseMode,
    projectRoot,
    projectStateQuery.data,
    projectStateQuery.isError,
    projectStateQuery.isLoading,
    projectSettingsQuery.isError,
    projectSettingsQuery.isLoading,
    requestKey,
    startedRequestKey,
    userBrief
  ]);

  useEffect(() => {
    if (!omakaseMode || !decisionSet || !canCreateBlueprint || createBlueprintMutation.isPending || blueprintReady) {
      return;
    }
    createBlueprintMutation.mutate();
  }, [blueprintReady, canCreateBlueprint, createBlueprintMutation, createBlueprintMutation.isPending, decisionSet, omakaseMode]);

  return {
    architectError,
    blueprintHtml,
    blueprintOpen,
    blueprintReady,
    blueprintStreamMessages,
    blueprintTimelineItems,
    bootstrapMutation,
    bootstrapSummary,
    canCreateBlueprint,
    closeBlueprint,
    continuePromptOpen,
    createBlueprintMutation,
    currentDecision,
    currentSelection,
    decisions,
    decisionSet,
    goNext,
    isComplete,
    pinnedChoices,
    projectRoot,
    requestKey,
    selectDecisionOption,
    setBlueprintOpen,
    setContinuePromptOpen,
    setStepIndex,
    setTutorialOpen,
    stepIndex,
    streamMessages,
    submittedBrief,
    timelineItems,
    tutorialOpen,
    userBrief,
    viewBlueprint: () => {
      setTutorialOpen(false);
      setBlueprintOpen(true);
    },
    continueToDesign: () => navigate("/makeover", { state: { fromArchitect: true } })
  };
}

export type ArchitectProgressController = ReturnType<typeof useArchitectProgressController>;
