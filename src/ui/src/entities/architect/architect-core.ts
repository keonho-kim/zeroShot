import { detectLocale, translate, type SupportedLocale } from "@/lib/i18n";

export type Locale = SupportedLocale;

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
  chatMessage: string;
  title: string;
  summary: string;
  decisions: ArchitectDecision[];
}

export type ArchitectAnswers = Record<string, string>;

export interface BlueprintResourceSummary {
  skillName?: string;
  designTemplateName?: string;
}

export function resolvedAnswerId(decision: ArchitectDecision, answerId: string | undefined): string | undefined {
  if (answerId === "omakase") {
    return decision.options.find((option) => option.id !== "omakase")?.id;
  }
  return answerId;
}

export { detectLocale };

export function selectedOption(answers: ArchitectAnswers, decision: ArchitectDecision): ArchitectDecisionOption | undefined {
  const selectedId = resolvedAnswerId(decision, answers[decision.id]);
  return decision.options.find((option) => option.id === selectedId);
}

export function isDecisionAnswered(answers: ArchitectAnswers, decision: ArchitectDecision): boolean {
  return selectedOption(answers, decision) !== undefined;
}

export function allDecisionsAnswered(decisions: ArchitectDecision[], answers: ArchitectAnswers): boolean {
  return decisions.every((decision) => isDecisionAnswered(answers, decision));
}

export function firstRoundEndIndex(decisions: ArchitectDecision[]): number {
  const languageIndex = decisions.findIndex((decision) => {
    const text = [decision.id, decision.title, decision.prompt, decision.section].join(" ");
    return /\b(language|stack|framework|runtime|development)\b/i.test(text)
      || /(개발\s*언어|기술\s*스택|프레임워크|런타임|개발)/i.test(text);
  });
  if (languageIndex >= 0) {
    return languageIndex;
  }

  const firstNonOverview = decisions.findIndex((decision) => {
    const section = decision.section.toLowerCase();
    return !/(overview|concept|개요|컨셉|방향)/i.test(section);
  });
  return firstNonOverview >= 0 ? Math.max(0, firstNonOverview - 1) : Math.min(2, decisions.length - 1);
}

export function buildBlueprintHtml(params: {
  locale: Locale;
  decisionSet: ArchitectDecisionSet;
  answers: ArchitectAnswers;
  projectRoot: string;
  userBrief: string;
  resources?: BlueprintResourceSummary;
}): string {
  const selectedSections = params.decisionSet.decisions.map((decision) => ({
    title: decision.section,
    option: selectedOption(params.answers, decision)
  }));
  const architectJson = JSON.stringify({
    title: params.decisionSet.title,
    summary: params.decisionSet.summary,
    decisions: params.decisionSet.decisions,
    answers: Object.fromEntries(params.decisionSet.decisions.map((decision) => [
      decision.id,
      resolvedAnswerId(decision, params.answers[decision.id]) ?? params.answers[decision.id]
    ]))
  }, null, 2);

  const resourceItems = [
    params.resources?.skillName ? `Skill: ${params.resources.skillName}` : "",
    params.resources?.designTemplateName ? `Design template: ${params.resources.designTemplateName}` : ""
  ].filter(Boolean);
  const userBriefLabel = translate(params.locale, "architect.productBrief");
  const designMaterialsLabel = translate(params.locale, "home.designBrief");

  const body = selectedSections.map((section, index) => `
    <section class="card" data-od-id="decision-section-${index + 1}" data-od-edit="container" data-od-label="${escapeHtml(section.title)}">
      <h2 data-od-id="decision-section-${index + 1}-title" data-od-edit="text" data-od-label="${escapeHtml(section.title)} title">${escapeHtml(section.title)}</h2>
      ${section.option ? `
        <article class="decision" data-od-id="decision-section-${index + 1}-choice" data-od-edit="container" data-od-label="${escapeHtml(section.option.label)}">
          <strong data-od-id="decision-section-${index + 1}-choice-label" data-od-edit="text">${escapeHtml(section.option.label)}</strong>
          <p data-od-id="decision-section-${index + 1}-choice-requirement" data-od-edit="text">${escapeHtml(section.option.productRequirement)}</p>
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
.phone{width:min(100%,390px);min-height:100vh;margin:0 auto;padding:18px 13px 27px;background:#f5f5f7}
.hero{padding:21px 18px;border-radius:19px;background:#fff;border:1px solid var(--line);box-shadow:0 13px 34px rgba(31,35,42,.06)}
.eyebrow{margin:0 0 8px;color:var(--blue);font-size:10px;font-weight:800;text-transform:uppercase}
h1{margin:0;font-size:27px;line-height:1.02;letter-spacing:0}
.sub{margin:11px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
.card{margin-top:11px;padding:14px;border-radius:16px;background:var(--panel);border:1px solid var(--line);box-shadow:0 10px 26px rgba(31,35,42,.055)}
h2{margin:0 0 10px;font-size:15px;line-height:1.2}
.decision{padding:11px;border-radius:11px;background:#f2f2f7}
.decision strong{display:block;font-size:13px}
.decision p{margin:5px 0 0;color:var(--muted);font-size:11px;line-height:1.45}
.footer{margin-top:14px;padding:14px;text-align:center;color:var(--muted);font-size:11px}
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
<main class="phone" data-od-id="product-blueprint" data-od-edit="container" data-od-label="Product blueprint">
  <header class="hero" data-od-id="blueprint-hero" data-od-edit="container" data-od-label="Hero">
    <p class="eyebrow" data-od-id="blueprint-eyebrow" data-od-edit="text" data-od-label="Eyebrow">PRODUCT Blueprint</p>
    <h1 data-od-id="blueprint-title" data-od-edit="text" data-od-label="Title">${escapeHtml(params.decisionSet.title)}</h1>
    <p class="sub" data-od-id="blueprint-summary" data-od-edit="text" data-od-label="Summary">${escapeHtml(params.decisionSet.summary)}</p>
    <p class="sub" data-od-id="blueprint-workspace" data-od-edit="text" data-od-label="Workspace">Workspace: ${escapeHtml(params.projectRoot || "Not selected")}</p>
  </header>
  <section class="card" data-od-id="user-brief-section" data-od-edit="container" data-od-label="${escapeHtml(userBriefLabel)}">
    <h2 data-od-id="user-brief-title" data-od-edit="text">${escapeHtml(userBriefLabel)}</h2>
    <article class="decision" data-od-id="user-brief-card" data-od-edit="container">
      <p data-od-id="user-brief-body" data-od-edit="text">${escapeHtml(params.userBrief)}</p>
    </article>
  </section>
  ${body}
  ${resourceItems.length ? `
  <section class="card" data-od-id="design-materials-section" data-od-edit="container" data-od-label="${escapeHtml(designMaterialsLabel)}">
    <h2 data-od-id="design-materials-title" data-od-edit="text">${escapeHtml(designMaterialsLabel)}</h2>
    <article class="decision" data-od-id="design-materials-card" data-od-edit="container">
      ${resourceItems.map((item, index) => `<p data-od-id="design-material-${index + 1}" data-od-edit="text">${escapeHtml(item)}</p>`).join("")}
    </article>
  </section>
  ` : ""}
  <footer class="footer" data-od-id="blueprint-footer" data-od-edit="text" data-od-label="Footer">End of blueprint. You can now start BUILD.</footer>
</main>
</body>
</html>`;
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
