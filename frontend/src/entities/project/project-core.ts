export interface BuildGateProjectState {
  isDirectoryEmpty: boolean;
  hasProductHtml: boolean;
}

export function canStartBuild(state: BuildGateProjectState): boolean {
  return !state.isDirectoryEmpty || state.hasProductHtml;
}

export function buildDisabledReason(state: BuildGateProjectState): string {
  if (canStartBuild(state)) {
    return "";
  }
  return "BUILD needs a non-empty workspace or PRODUCT.html.";
}
