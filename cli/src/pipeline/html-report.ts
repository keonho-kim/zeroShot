import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PipelineContext, PipelineState } from "@cli/pipeline/types";

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
    :root {
      color-scheme: light;
      --bg: #fbfaf5;
      --fg: #151515;
      --muted: #5f6673;
      --line: #d9dde7;
      --panel: #ffffff;
      --panel-soft: #f3f6fb;
      --accent: #0ea5e9;
      --code: #10151f;
    }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--fg);
      font-family: "Noto Sans KR", "Noto Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.65;
      text-rendering: optimizeLegibility;
    }
    main { max-width: 1040px; margin: 0 auto; padding: 40px 28px 56px; }
    header { border-bottom: 1px solid var(--line); margin-bottom: 28px; padding-bottom: 20px; }
    h1 { font-size: clamp(30px, 5vw, 52px); line-height: 1.08; margin: 0 0 10px; }
    h2 { font-size: 18px; line-height: 1.3; margin: 30px 0 12px; }
    p { margin: 0 0 12px; }
    ul { margin: 10px 0 0; padding-left: 20px; }
    li + li { margin-top: 6px; }
    .meta { color: var(--muted); display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; }
    .meta > span,
    .status {
      align-items: center;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 999px;
      display: inline-flex;
      font-weight: 700;
      gap: 6px;
      min-height: 28px;
      padding: 3px 10px;
    }
    .panel,
    details {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 14px;
      box-shadow: 0 18px 44px rgb(20 26 36 / 8%);
    }
    .panel { padding: 18px 20px; }
    details { margin: 14px 0; padding: 16px 18px; }
    summary { cursor: pointer; font-weight: 800; }
    code {
      background: var(--panel-soft);
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.92em;
      padding: 1px 5px;
    }
    pre {
      background: var(--code);
      border-radius: 12px;
      color: #f6f8fa;
      overflow: auto;
      padding: 16px;
    }
    pre code { background: transparent; color: inherit; padding: 0; }
    .muted { color: var(--muted); }
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
