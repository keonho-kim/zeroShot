import { Card } from "@/shared/ui/card";
import { designModeLabel } from "@/entities/design/design-runtime";
import type { DesignRuntimeResponse } from "@/types/api";
import { modeIcon } from "@/pages/design/design-page-model";

export function DesignResult({ design, artifactHtml }: { design: DesignRuntimeResponse; artifactHtml: string }) {
  return (
    <section className="design-result" aria-label="Design runtime result">
      <Card className="design-result-hero">
        <div className="agent-panel-heading">
          <div className="agent-panel-icon">
            {modeIcon(design.mode)}
          </div>
          <div className="min-w-0">
            <p className="agent-panel-kicker">{designModeLabel(design.mode)}</p>
            <h2>{design.title}</h2>
            <p>{design.summary}</p>
          </div>
        </div>
      </Card>

      <div className="design-result-grid">
        <Card className="design-output-panel">
          <p className="agent-panel-kicker">BRIEF PREVIEW</p>
          <div className="design-mini-preview">
            {artifactHtml ? <iframe title="Design brief preview" srcDoc={artifactHtml} /> : null}
          </div>
        </Card>

        <div className="design-side-stack">
          <Card className="design-output-panel">
            <p className="agent-panel-kicker">DESIGN DIRECTION</p>
            <div className="design-section-list">
              {design.sections.slice(0, 3).map((section) => (
                <article className="design-section-item" key={section.id}>
                  <h3>{section.title}</h3>
                  <p>{section.body}</p>
                </article>
              ))}
            </div>
          </Card>

          <Card className="design-output-panel">
            <p className="agent-panel-kicker">UX FLOW POINTS</p>
            <div className="design-action-list">
              {design.actions.map((action) => (
                <article className="design-action-item" key={`${action.owner}-${action.label}`}>
                  <strong>{action.label}</strong>
                  <span>{action.owner}</span>
                  <p>{action.detail}</p>
                </article>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
