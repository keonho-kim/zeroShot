import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { designModeLabel } from "@/entities/design/design-runtime";
import type { DesignRuntimeResponse } from "@/types/api";
import { modeIcon } from "@/pages/design/design-page-model";

export function DesignResult({ design }: { design: DesignRuntimeResponse }) {
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
          <p className="agent-panel-kicker">DESIGN SECTIONS</p>
          <div className="design-section-list">
            {design.sections.map((section) => (
              <article className="design-section-item" key={section.id}>
                <h3>{section.title}</h3>
                <p>{section.body}</p>
              </article>
            ))}
          </div>
        </Card>

        <div className="design-side-stack">
          <Card className="design-output-panel">
            <p className="agent-panel-kicker">ACTIONS</p>
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

          <Card className="design-output-panel">
            <p className="agent-panel-kicker">ARTIFACTS</p>
            <div className="design-artifact-list">
              {design.artifacts.map((artifact) => (
                <article className="design-artifact-item" key={artifact.path}>
                  <FileText aria-hidden="true" />
                  <div>
                    <strong>{artifact.title}</strong>
                    <span>{artifact.path}</span>
                    <p>{artifact.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
