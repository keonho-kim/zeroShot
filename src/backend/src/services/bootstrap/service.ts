import { spawn } from "node:child_process";
import { basename } from "node:path";
import { buildBootstrapCommandSpec } from "@backend/core/cli-command";
import type { BootstrapRequest, BootstrapResult, PipelineCommandSpec } from "@backend/types/pipeline";

export function inferBootstrapRequest(params: {
  projectRoot: string;
  answers: Record<string, string>;
  decisions: Array<{ id: string; section: string; title: string; prompt: string; options: Array<{ id: string; label: string; detail: string; productRequirement: string }> }>;
}): BootstrapRequest {
  const selectedText = params.decisions
    .map((decision) => {
      const answer = params.answers[decision.id];
      const option = decision.options.find((candidate) => candidate.id === answer) ?? decision.options[0];
      return [decision.title, decision.prompt, option?.label, option?.detail, option?.productRequirement].join(" ");
    })
    .join(" ")
    .toLowerCase();

  const requestedProjectType = selectedText.match(/--type\s+(backend|frontend|fullstack|library|script)\b/)?.[1] as BootstrapRequest["projectType"] | undefined;
  const requestedLanguage = selectedText.match(/--language\s+([a-z0-9-]+)/)?.[1];
  const requestedServerLanguage = selectedText.match(/--server-language\s+([a-z0-9-]+)/)?.[1];
  const requestedUiLanguage = selectedText.match(/--ui-language\s+([a-z0-9-]+)/)?.[1];
  const requestedProfile = selectedText.match(/--profile\s+(standard|llm)\b/)?.[1] as BootstrapRequest["profile"] | undefined;
  const uiLanguage = requestedUiLanguage ?? "typescript";
  const projectType = requestedProjectType ?? (selectedText.includes("frontend-only") || selectedText.includes("frontend only")
    ? "frontend"
    : selectedText.includes("library")
      ? "library"
      : selectedText.includes("script")
        ? "script"
        : selectedText.includes("backend-only") || selectedText.includes("backend only")
          ? "backend"
          : "fullstack");
  const serverLanguage = requestedServerLanguage ?? requestedLanguage ?? inferServerLanguage(selectedText);

  return {
    projectRoot: params.projectRoot,
    projectType,
    language: projectType === "frontend" ? uiLanguage : serverLanguage,
    serverLanguage,
    uiLanguage,
    name: basename(params.projectRoot),
    profile: requestedProfile ?? (selectedText.includes("llm") || selectedText.includes("agent") || selectedText.includes("langgraph") || selectedText.includes("mcp") || selectedText.includes("a2a")
      ? "llm"
      : "standard")
  };
}

function inferServerLanguage(text: string): string {
  if (text.includes("python") || text.includes("fastapi") || text.includes("django")) {
    return "python";
  }
  if (text.includes("go ") || text.includes("golang")) {
    return "go";
  }
  if (text.includes("rust") || text.includes("tokio") || text.includes("axum")) {
    return "rust";
  }
  if (text.includes("java") || text.includes("spring") || text.includes("gradle")) {
    return "java";
  }
  if (text.includes("ruby") || text.includes("rails")) {
    return "ruby";
  }
  if (text.includes("zig")) {
    return "zig";
  }
  return "typescript";
}

export async function runBootstrap(
  request: BootstrapRequest,
  runner: (spec: PipelineCommandSpec) => Promise<{ stdout: string; stderr: string }> = runBootstrapCommand
): Promise<BootstrapResult> {
  const spec = buildBootstrapCommandSpec(request);
  const output = await runner(spec);

  return {
    command: spec.command,
    args: spec.args,
    stdout: output.stdout,
    stderr: output.stderr
  };
}

export async function runBootstrapCommand(spec: PipelineCommandSpec): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: spec.env
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr.trim() || stdout.trim() || `bootstrap exited with code ${code ?? 1}`));
    });
  });
}
