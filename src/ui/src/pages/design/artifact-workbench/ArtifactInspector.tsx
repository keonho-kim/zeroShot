import { MousePointer2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  ArtifactEditorTab,
  ArtifactEditTarget,
  ArtifactSourcePatch
} from "@/entities/design/artifact-editor";
import type { CommitArtifactPatch } from "@/pages/design/artifact-workbench/types";
import { cn } from "@/utils/cn";

const editorTabs = [
  ["content", "Content"],
  ["style", "Style"]
] satisfies Array<[ArtifactEditorTab, string]>;

const styleFields = [
  ["color", "Color"],
  ["backgroundColor", "Background"],
  ["fontSize", "Font size"],
  ["fontWeight", "Weight"],
  ["textAlign", "Align"],
  ["padding", "Padding"],
  ["margin", "Margin"],
  ["borderRadius", "Radius"],
  ["border", "Border"],
  ["width", "Width"],
  ["minHeight", "Min height"],
  ["transform", "Transform"]
] as const;

export function ArtifactInspector(props: {
  selectedTarget: ArtifactEditTarget | null;
  artifactTab: ArtifactEditorTab;
  setArtifactTab: Dispatch<SetStateAction<ArtifactEditorTab>>;
  attributeDraft: string;
  setAttributeDraft: Dispatch<SetStateAction<string>>;
  outerHtmlDraft: string;
  setOuterHtmlDraft: Dispatch<SetStateAction<string>>;
  sourceDraft: string;
  setSourceDraft: Dispatch<SetStateAction<string>>;
  onCommitPatch: CommitArtifactPatch;
  onApplyAttributeDraft: () => void;
}) {
  if (!props.selectedTarget) {
    return (
      <aside className="design-artifact-inspector" aria-label="Artifact inspector">
        <div className="design-empty-source">
          <MousePointer2 aria-hidden="true" />
          <strong>요소를 선택하세요</strong>
          <span>미리보기나 레이어 패널에서 target을 선택하면 Content와 Style 편집이 활성화됩니다.</span>
        </div>
      </aside>
    );
  }

  const target = props.selectedTarget;

  return (
    <aside className="design-artifact-inspector" aria-label="Artifact inspector">
      <div className="design-target-header">
        <strong>{target.label}</strong>
        <span>{target.tagName} · {target.kind} · {target.id}</span>
      </div>
      <div className="design-editor-tabs" role="tablist" aria-label="Editor tabs">
        {editorTabs.map(([id, label]) => (
          <button
            type="button"
            key={id}
            role="tab"
            aria-selected={props.artifactTab === id}
            className={cn(props.artifactTab === id && "selected")}
            onClick={() => props.setArtifactTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {props.artifactTab === "content" ? (
        <ArtifactContentEditor target={target} onCommitPatch={props.onCommitPatch} />
      ) : null}

      {props.artifactTab === "style" ? (
        <div className="design-style-grid">
          {styleFields.map(([property, label]) => (
            <label key={property}>
              <span>{label}</span>
              <input
                value={target.styles[property as keyof typeof target.styles] ?? ""}
                onChange={(event) => props.onCommitPatch({
                  kind: "set-style",
                  id: target.id,
                  styles: { [property]: event.target.value }
                } as ArtifactSourcePatch, target)}
              />
            </label>
          ))}
        </div>
      ) : null}

      {props.artifactTab === "attributes" ? (
        <div className="design-manual-controls">
          <label>
            <span>Attributes JSON</span>
            <Textarea value={props.attributeDraft} onChange={(event) => props.setAttributeDraft(event.target.value)} />
          </label>
          <Button variant="outline" onClick={props.onApplyAttributeDraft}>Apply attributes</Button>
        </div>
      ) : null}

      {props.artifactTab === "html" ? (
        <div className="design-manual-controls">
          <label>
            <span>Outer HTML</span>
            <Textarea value={props.outerHtmlDraft} onChange={(event) => props.setOuterHtmlDraft(event.target.value)} />
          </label>
          <Button variant="outline" onClick={() => props.onCommitPatch({ kind: "set-outer-html", id: target.id, html: props.outerHtmlDraft }, target)}>Apply HTML</Button>
        </div>
      ) : null}

      {props.artifactTab === "source" ? (
        <div className="design-manual-controls">
          <label>
            <span>Full source</span>
            <Textarea value={props.sourceDraft} onChange={(event) => props.setSourceDraft(event.target.value)} />
          </label>
          <Button variant="outline" onClick={() => props.onCommitPatch({ kind: "set-full-source", source: props.sourceDraft })}>Apply source</Button>
        </div>
      ) : null}
    </aside>
  );
}

function ArtifactContentEditor(props: {
  target: ArtifactEditTarget;
  onCommitPatch: CommitArtifactPatch;
}) {
  return (
    <div className="design-manual-controls">
      {props.target.kind === "link" ? (
        <>
          <label>
            <span>Label</span>
            <input
              value={props.target.fields.text ?? ""}
              onChange={(event) => props.onCommitPatch({
                kind: "set-link",
                id: props.target.id,
                text: event.target.value,
                href: props.target.fields.href ?? ""
              }, props.target)}
            />
          </label>
          <label>
            <span>Href</span>
            <input
              value={props.target.fields.href ?? ""}
              onChange={(event) => props.onCommitPatch({
                kind: "set-link",
                id: props.target.id,
                text: props.target.fields.text ?? props.target.text,
                href: event.target.value
              }, props.target)}
            />
          </label>
        </>
      ) : props.target.kind === "image" ? (
        <>
          <label>
            <span>Image src</span>
            <input
              value={props.target.fields.src ?? ""}
              onChange={(event) => props.onCommitPatch({
                kind: "set-image",
                id: props.target.id,
                src: event.target.value,
                alt: props.target.fields.alt ?? ""
              }, props.target)}
            />
          </label>
          <label>
            <span>Alt</span>
            <input
              value={props.target.fields.alt ?? ""}
              onChange={(event) => props.onCommitPatch({
                kind: "set-image",
                id: props.target.id,
                src: props.target.fields.src ?? "",
                alt: event.target.value
              }, props.target)}
            />
          </label>
        </>
      ) : props.target.kind === "container" ? (
        <div className="design-layer-empty">
          <strong>Container target</strong>
          <span>컨테이너의 직접 텍스트 변경은 HTML 탭에서 처리합니다.</span>
        </div>
      ) : (
        <label>
          <span>Text</span>
          <Textarea
            data-testid="artifact-text-input"
            value={props.target.fields.text ?? props.target.text}
            onChange={(event) => props.onCommitPatch({
              kind: "set-text",
              id: props.target.id,
              value: event.target.value
            }, props.target)}
          />
        </label>
      )}
    </div>
  );
}
