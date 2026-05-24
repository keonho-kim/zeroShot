import type { DesignRuntimeResponse } from "@/types/api";

export type MakeoverStep = "brief" | "loading" | "workbench" | "preview";
export type DesignResourceSelectionMode = "manual" | "omakase";

export type DesignRunRequest = {
  goal: string;
  assistantMessageId?: string;
  source: "request" | "workbench";
};

export type DesignResultSetter = (value: DesignRuntimeResponse | null) => void;
