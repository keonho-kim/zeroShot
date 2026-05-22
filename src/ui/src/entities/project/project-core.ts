export interface BuildGateProjectState {
  isDirectoryEmpty: boolean;
  hasProductHtml: boolean;
}

export interface DesignGateProjectState {
  hasProductHtml: boolean;
}

export interface UpdateGateProjectState {
  hasSourceCode: boolean;
  runsCount: number;
}

export function canStartDesign(state: DesignGateProjectState): boolean {
  return state.hasProductHtml;
}

export function canStartBuild(state: BuildGateProjectState): boolean {
  return !state.isDirectoryEmpty || state.hasProductHtml;
}

export function buildDisabledReason(state: BuildGateProjectState): string {
  if (canStartBuild(state)) {
    return "";
  }
  return "BUILD needs a product blueprint or non-empty workspace.";
}

export function canStartUpdate(state: UpdateGateProjectState): boolean {
  return state.runsCount > 0 && state.hasSourceCode;
}

export function updateDisabledReason(state: UpdateGateProjectState): string {
  if (canStartUpdate(state)) {
    return "";
  }
  if (state.runsCount < 1) {
    return "Run BUILD first.";
  }
  return "No source code is available to update.";
}
