import type { CodexLogTranslate } from "@/entities/codex/codex-loading-log";

function firstCommandToken(command: string): string {
  return command.trim().split(/\s+/)[0]?.replace(/^.*\//, "") ?? "";
}

export function displayCommand(command: string): string {
  const trimmed = command.trim();
  const shellCommand = trimmed.match(/^(?:.*\/)?(?:sh|bash|zsh)\s+-lc\s+([\s\S]+)$/);
  const inner = shellCommand?.[1]?.trim();
  if (!inner) {
    return trimmed;
  }
  const quoted = inner.match(/^(['"])([\s\S]*)\1$/);
  return quoted?.[2] || inner;
}

export function commandIcon(command: string): string {
  const normalized = displayCommand(command);
  const token = firstCommandToken(normalized);

  if (["rg", "grep", "find", "fd", "ag"].includes(token)) {
    return "🔎";
  }
  if (["ls", "tree", "pwd", "du"].includes(token)) {
    return "📁";
  }
  if (["cat", "sed", "awk", "head", "tail", "less", "nl"].includes(token)) {
    return "📄";
  }
  if (["curl", "wget"].includes(token)) {
    return "🌐";
  }
  if (token === "git") {
    return "🌿";
  }
  if (["bun", "npm", "pnpm", "yarn", "node"].includes(token)) {
    return "📦";
  }
  if (["go", "cargo", "pytest", "vitest", "jest", "tsc"].includes(token)) {
    return "✅";
  }
  return "⌨️";
}

export function commandLabel(command: string, t: CodexLogTranslate): { icon: string; title: string } {
  const normalized = displayCommand(command);
  const token = firstCommandToken(normalized);
  const icon = commandIcon(command);

  if (["rg", "grep", "find", "fd", "ag"].includes(token)) {
    return { icon, title: t("log.tool.searchFiles") };
  }
  if (["ls", "tree", "pwd", "du"].includes(token)) {
    return { icon, title: t("log.tool.browseFiles") };
  }
  if (["cat", "sed", "awk", "head", "tail", "less", "nl"].includes(token)) {
    return { icon, title: t("log.tool.readFile") };
  }
  if (["curl", "wget"].includes(token)) {
    return { icon, title: t("log.tool.networkRequest") };
  }
  if (token === "git") {
    return { icon, title: t("log.tool.git") };
  }
  if (["bun", "npm", "pnpm", "yarn", "node"].includes(token)) {
    return { icon, title: t("log.tool.javascript") };
  }
  if (["go", "cargo", "pytest", "vitest", "jest", "tsc"].includes(token)) {
    return { icon, title: t("log.tool.check") };
  }
  return { icon, title: t("log.tool.command") };
}
