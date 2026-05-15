import { create } from "zustand";
import type { ArchitectAnswers, ArchitectDecisionSet } from "@/entities/architect/architect-core";
import type { ArchitectProgressEvent } from "@/types/api";

export interface ArchitectTimelineItem extends ArchitectProgressEvent {
  updates: string[];
}

function upsertTimelineItem(items: ArchitectTimelineItem[], event: ArchitectProgressEvent): ArchitectTimelineItem[] {
  const index = items.findIndex((item) => item.id === event.id);
  if (index === -1) {
    return [...items, { ...event, updates: [event.detail] }];
  }

  return items.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item;
    }
    const updates = item.updates[item.updates.length - 1] === event.detail
      ? item.updates
      : [...item.updates, event.detail];
    return { ...item, ...event, updates };
  });
}

interface ArchitectFlowState {
  requestKey: string;
  startedRequestKey: string;
  userBrief: string;
  submittedBrief: string;
  decisionSet: ArchitectDecisionSet | null;
  stepIndex: number;
  answers: ArchitectAnswers;
  blueprintHtml: string;
  blueprintReady: boolean;
  blueprintOpen: boolean;
  tutorialOpen: boolean;
  continuePromptOpen: boolean;
  architectPending: boolean;
  architectError: string;
  timelineItems: ArchitectTimelineItem[];
  expandedTimelineId: string | null;
  setUserBrief: (value: string) => void;
  prepareRequest: (params: { brief: string; requestKey: string }) => void;
  markRequestStarted: (requestKey: string) => void;
  addProgress: (event: ArchitectProgressEvent) => void;
  completeRequest: (decisionSet: ArchitectDecisionSet) => void;
  failRequest: (message: string) => void;
  chooseOption: (decisionId: string, optionId: string) => void;
  setStepIndex: (value: number | ((current: number) => number)) => void;
  setBlueprintHtml: (value: string) => void;
  setBlueprintReady: (value: boolean) => void;
  setBlueprintOpen: (value: boolean) => void;
  setTutorialOpen: (value: boolean) => void;
  setContinuePromptOpen: (value: boolean) => void;
  setExpandedTimelineId: (value: string | null) => void;
}

export const useArchitectFlowStore = create<ArchitectFlowState>((set) => ({
  requestKey: "",
  startedRequestKey: "",
  userBrief: "",
  submittedBrief: "",
  decisionSet: null,
  stepIndex: 0,
  answers: {},
  blueprintHtml: "",
  blueprintReady: false,
  blueprintOpen: false,
  tutorialOpen: false,
  continuePromptOpen: false,
  architectPending: false,
  architectError: "",
  timelineItems: [],
  expandedTimelineId: null,
  setUserBrief: (value) => set({ userBrief: value }),
  prepareRequest: ({ brief, requestKey }) => set({
    requestKey,
    startedRequestKey: "",
    userBrief: brief,
    submittedBrief: "",
    decisionSet: null,
    stepIndex: 0,
    answers: {},
    blueprintHtml: "",
    blueprintReady: false,
    blueprintOpen: false,
    tutorialOpen: false,
    continuePromptOpen: false,
    architectPending: false,
    architectError: "",
    timelineItems: [],
    expandedTimelineId: null
  }),
  markRequestStarted: (requestKey) => set({
    startedRequestKey: requestKey,
    architectPending: true,
    architectError: "",
    timelineItems: [],
    expandedTimelineId: null
  }),
  addProgress: (event) => set((state) => ({
    timelineItems: upsertTimelineItem(state.timelineItems, event),
    expandedTimelineId: event.id
  })),
  completeRequest: (decisionSet) => set((state) => ({
    submittedBrief: state.userBrief,
    decisionSet,
    timelineItems: [],
    expandedTimelineId: null,
    architectPending: false
  })),
  failRequest: (message) => set({
    architectPending: false,
    architectError: message
  }),
  chooseOption: (decisionId, optionId) => set((state) => ({
    answers: { ...state.answers, [decisionId]: optionId }
  })),
  setStepIndex: (value) => set((state) => ({
    stepIndex: typeof value === "function" ? value(state.stepIndex) : value
  })),
  setBlueprintHtml: (value) => set({ blueprintHtml: value }),
  setBlueprintReady: (value) => set({ blueprintReady: value }),
  setBlueprintOpen: (value) => set({ blueprintOpen: value }),
  setTutorialOpen: (value) => set({ tutorialOpen: value }),
  setContinuePromptOpen: (value) => set({ continuePromptOpen: value }),
  setExpandedTimelineId: (value) => set({ expandedTimelineId: value })
}));
