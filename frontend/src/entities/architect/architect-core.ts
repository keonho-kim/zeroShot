export type Locale = "en" | "ko";

export interface ArchitectDecisionOption {
  id: string;
  label: string;
  detail: string;
  productRequirement: string;
}

export interface ArchitectDecision {
  id: string;
  title: string;
  prompt: string;
  section: string;
  options: ArchitectDecisionOption[];
}

export interface ArchitectDecisionSet {
  title: string;
  summary: string;
  decisions: ArchitectDecision[];
}

export type ArchitectAnswers = Record<string, string>;

export function detectLocale(language: string): Locale {
  return language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export function selectedOption(answers: ArchitectAnswers, decision: ArchitectDecision): ArchitectDecisionOption | undefined {
  const selectedId = answers[decision.id];
  return decision.options.find((option) => option.id === selectedId);
}

export function isDecisionAnswered(answers: ArchitectAnswers, decision: ArchitectDecision): boolean {
  return selectedOption(answers, decision) !== undefined;
}

export function allDecisionsAnswered(decisions: ArchitectDecision[], answers: ArchitectAnswers): boolean {
  return decisions.every((decision) => isDecisionAnswered(answers, decision));
}

export function buildBlueprintHtml(params: {
  locale: Locale;
  decisionSet: ArchitectDecisionSet;
  answers: ArchitectAnswers;
  projectRoot: string;
  userBrief: string;
}): string {
  const selectedSections = params.decisionSet.decisions.map((decision) => ({
    title: decision.section,
    option: selectedOption(params.answers, decision)
  }));
  const architectJson = JSON.stringify({
    title: params.decisionSet.title,
    summary: params.decisionSet.summary,
    decisions: params.decisionSet.decisions,
    answers: params.answers
  }, null, 2);

  const body = selectedSections.map((section) => `
    <section class="card">
      <h2>${escapeHtml(section.title)}</h2>
      ${section.option ? `
        <article class="decision">
          <strong>${escapeHtml(section.option.label)}</strong>
          <p>${escapeHtml(section.option.productRequirement)}</p>
        </article>
      ` : ""}
    </section>
  `).join("");

  return `<!doctype html>
<html lang="${params.locale}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(params.decisionSet.title)}</title>
<style>
:root{color-scheme:light;--blue:#0071e3;--ink:#1d1d1f;--muted:#6e6e73;--line:#e5e5ea;--bg:#f5f5f7;--panel:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif}
.phone{width:min(100%,430px);min-height:100vh;margin:0 auto;padding:22px 16px 34px;background:#f5f5f7}
.hero{padding:26px 22px;border-radius:24px;background:#fff;border:1px solid var(--line);box-shadow:0 16px 42px rgba(31,35,42,.06)}
.eyebrow{margin:0 0 10px;color:var(--blue);font-size:12px;font-weight:800;text-transform:uppercase}
h1{margin:0;font-size:34px;line-height:1.02;letter-spacing:0}
.sub{margin:14px 0 0;color:var(--muted);font-size:14px;line-height:1.55}
.card{margin-top:14px;padding:18px;border-radius:20px;background:var(--panel);border:1px solid var(--line);box-shadow:0 12px 32px rgba(31,35,42,.055)}
h2{margin:0 0 12px;font-size:18px;line-height:1.2}
.decision{padding:14px;border-radius:14px;background:#f2f2f7}
.decision strong{display:block;font-size:15px}
.decision p{margin:6px 0 0;color:var(--muted);font-size:13px;line-height:1.5}
.footer{margin-top:18px;padding:18px;text-align:center;color:var(--muted);font-size:13px}
</style>
<script type="application/json" id="architect-decisions">
${escapeScriptJson(architectJson)}
</script>
<script>
let sent=false;
window.addEventListener("scroll",()=>{const nearEnd=window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-24;if(nearEnd&&!sent){sent=true;window.parent.postMessage("zeroshot:blueprint-end","*")}}, { passive:true });
</script>
</head>
<body>
<main class="phone">
  <header class="hero">
    <p class="eyebrow">PRODUCT Blueprint</p>
    <h1>${escapeHtml(params.decisionSet.title)}</h1>
    <p class="sub">${escapeHtml(params.decisionSet.summary)}</p>
    <p class="sub">Workspace: ${escapeHtml(params.projectRoot || "Not selected")}</p>
  </header>
  <section class="card">
    <h2>${params.locale === "ko" ? "사용자 설명" : "User brief"}</h2>
    <article class="decision">
      <p>${escapeHtml(params.userBrief)}</p>
    </article>
  </section>
  ${body}
  <footer class="footer">End of blueprint. You can now start BUILD.</footer>
</main>
</body>
</html>`;
}

export function blueprintToProductMarkdown(html: string): string {
  return [
    "# PRODUCT",
    "",
    "This PRODUCT.md was generated from PRODUCT.html.",
    "Use PRODUCT.html as the canonical interactive blueprint and this markdown file as the Codex pipeline input.",
    "",
    "## Blueprint HTML",
    "```html",
    html,
    "```",
    ""
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function escapeScriptJson(value: string): string {
  return value.replaceAll("<", "\\u003c");
}
