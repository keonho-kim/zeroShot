import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PipelineContext, PipelineState } from "@cli/pipeline/types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function list(items: string[]): string {
  if (!items.length) {
    return "<p class=\"muted\">None recorded.</p>";
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; --line: #d6d8df; --muted: #667085; --panel: #f7f8fb; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; }
    main { max-width: 960px; margin: 0 auto; padding: 32px 20px 48px; }
    header { border-bottom: 1px solid var(--line); margin-bottom: 24px; padding-bottom: 16px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    h2 { font-size: 18px; margin: 28px 0 10px; }
    .meta { color: var(--muted); display: flex; flex-wrap: wrap; gap: 10px 18px; font-size: 13px; }
    .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px; }
    details { border: 1px solid var(--line); border-radius: 8px; margin: 10px 0; padding: 12px 14px; }
    summary { cursor: pointer; font-weight: 700; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; }
    .muted { color: var(--muted); }
    .status { display: inline-block; border: 1px solid var(--line); border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 700; }
    @media (prefers-color-scheme: dark) { :root { --line: #2c3340; --muted: #a4adbb; --panel: #151922; } body { background: #0f1218; color: #eef2f7; } }
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

export async function writeRunHtmlReports(ctx: PipelineContext, state: PipelineState, pipelineFailed: boolean, failureReason: string): Promise<{ workLogHtml: string; resultReportHtml: string }> {
  await mkdir(ctx.runDir, { recursive: true });
  const workLogHtml = join(ctx.runDir, "work-log.html");
  const resultReportHtml = join(ctx.runDir, "result-report.html");
  const status = pipelineFailed ? "FAIL" : "PASS";

  const workEntries = state.completedTasks.length
    ? state.completedTasks.map((entry, index) => `<details open>
        <summary>${index + 1}. ${escapeHtml(entry.title)}</summary>
        <p>${escapeHtml(entry.summary || "No summary recorded.")}</p>
        <h2>Files Changed</h2>${list(entry.filesChanged)}
        <h2>Commands Run</h2>${list(entry.commandsRun)}
        <h2>Validation</h2><p>${escapeHtml(entry.validationResult || "Not recorded.")}</p>
        <h2>Result</h2><p>${escapeHtml(entry.result || "Not recorded.")}</p>
      </details>`).join("")
    : "<p class=\"muted\">No implementation entries were recorded.</p>";

  await writeFile(workLogHtml, page("ZeroShot Work Log", `<main>
    <header>
      <h1>Work Log</h1>
      <div class="meta">
        <span>Run: <code>${escapeHtml(ctx.runName)}</code></span>
        <span>Mode: <code>${escapeHtml(ctx.mode)}</code></span>
        <span>Status: <span class="status">${status}</span></span>
        <span>Project: <code>${escapeHtml(ctx.projectRoot)}</code></span>
      </div>
    </header>
    <section class="panel">
      <h2>Latest Summary</h2>
      <p>${escapeHtml(state.latestSummary || "No summary recorded.")}</p>
    </section>
    <h2>Work Entries</h2>
    ${workEntries}
    <h2>Open Issues</h2>
    ${list(state.openIssues)}
  </main>`), "utf8");

  await writeFile(resultReportHtml, page("ZeroShot Result Report", `<main>
    <header>
      <h1>Result Report</h1>
      <div class="meta">
        <span>Run: <code>${escapeHtml(ctx.runName)}</code></span>
        <span>Mode: <code>${escapeHtml(ctx.mode)}</code></span>
        <span>Status: <span class="status">${status}</span></span>
        ${failureReason ? `<span>Failure: <code>${escapeHtml(failureReason)}</code></span>` : ""}
      </div>
    </header>
    <section class="panel">
      <h2>User Summary</h2>
      <p>${escapeHtml(state.latestSummary || state.goalSummary || "No final summary recorded.")}</p>
    </section>
    <h2>Changed Files</h2>
    ${list(state.changedFiles)}
    <h2>Validation</h2>
    ${list(state.validation)}
    <h2>Remaining Risks</h2>
    ${list(state.openIssues)}
    <h2>Recommended Next Action</h2>
    ${list(state.nextSteps)}
  </main>`), "utf8");

  return { workLogHtml, resultReportHtml };
}
