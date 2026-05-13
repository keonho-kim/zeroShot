export interface BuildGateProjectState {
  isDirectoryEmpty: boolean;
  hasProductHtml: boolean;
}

export interface DesignGateProjectState {
  hasProductHtml: boolean;
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
