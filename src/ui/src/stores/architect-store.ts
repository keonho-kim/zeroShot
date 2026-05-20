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
  omakaseMode: boolean;
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
  streamMessages: string[];
  blueprintTimelineItems: ArchitectTimelineItem[];
  blueprintStreamMessages: string[];
  expandedTimelineId: string | null;
  setUserBrief: (value: string) => void;
  prepareRequest: (params: { brief: string; requestKey: string; omakaseMode: boolean }) => void;
  markRequestStarted: (requestKey: string) => void;
  addProgress: (event: ArchitectProgressEvent) => void;
  addStreamMessage: (message: string) => void;
  resetBlueprintStream: () => void;
  addBlueprintProgress: (event: ArchitectProgressEvent) => void;
  addBlueprintStreamMessage: (message: string) => void;
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
  omakaseMode: false,
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
  streamMessages: [],
  blueprintTimelineItems: [],
  blueprintStreamMessages: [],
  expandedTimelineId: null,
  setUserBrief: (value) => set({ userBrief: value }),
  prepareRequest: ({ brief, requestKey, omakaseMode }) => set({
    requestKey,
    startedRequestKey: "",
    userBrief: brief,
    submittedBrief: "",
    omakaseMode,
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
    streamMessages: [],
    blueprintTimelineItems: [],
    blueprintStreamMessages: [],
    expandedTimelineId: null
  }),
  markRequestStarted: (requestKey) => set({
    startedRequestKey: requestKey,
    architectPending: true,
    architectError: "",
    timelineItems: [],
    streamMessages: [],
    blueprintTimelineItems: [],
    blueprintStreamMessages: [],
    expandedTimelineId: null
  }),
  addProgress: (event) => set((state) => ({
    timelineItems: upsertTimelineItem(state.timelineItems, event),
    expandedTimelineId: event.id
  })),
  addStreamMessage: (message) => set((state) => {
    const trimmed = message.trim();
    if (!trimmed || state.streamMessages.at(-1) === trimmed) {
      return state;
    }
    return {
      streamMessages: [...state.streamMessages.slice(-24), trimmed]
    };
  }),
  resetBlueprintStream: () => set({
    blueprintTimelineItems: [],
    blueprintStreamMessages: [],
    expandedTimelineId: null
  }),
  addBlueprintProgress: (event) => set((state) => ({
    blueprintTimelineItems: upsertTimelineItem(state.blueprintTimelineItems, event),
    expandedTimelineId: event.id
  })),
  addBlueprintStreamMessage: (message) => set((state) => {
    const trimmed = message.trim();
    if (!trimmed || state.blueprintStreamMessages.at(-1) === trimmed) {
      return state;
    }
    return {
      blueprintStreamMessages: [...state.blueprintStreamMessages.slice(-24), trimmed]
    };
  }),
  completeRequest: (decisionSet) => set((state) => {
    const answers = state.omakaseMode
      ? Object.fromEntries(decisionSet.decisions.map((decision) => [decision.id, decision.options[0]?.id ?? ""]))
      : {};
    return {
      submittedBrief: state.userBrief,
      decisionSet,
      stepIndex: state.omakaseMode ? decisionSet.decisions.length : state.stepIndex,
      answers,
      continuePromptOpen: state.omakaseMode,
      architectPending: false
    };
  }),
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
