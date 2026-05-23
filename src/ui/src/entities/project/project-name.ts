export function projectName(projectRoot: string): string {
  return projectRoot.split("/").filter(Boolean).at(-1) || projectRoot;
}
