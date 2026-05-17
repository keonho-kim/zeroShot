import { Search } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { ArtifactEditorMode, ArtifactEditTarget } from "@/entities/design/artifact-editor";
import type { DesignRuntimeResponse } from "@/types/api";
import { cn } from "@/utils/cn";

export function ArtifactLayerPanel(props: {
  trackedArtifacts: DesignRuntimeResponse["artifacts"];
  layerSearch: string;
  setLayerSearch: Dispatch<SetStateAction<string>>;
  filteredTargets: ArtifactEditTarget[];
  selectedTarget: ArtifactEditTarget | null;
  setSelectedTarget: Dispatch<SetStateAction<ArtifactEditTarget | null>>;
  setArtifactMode: Dispatch<SetStateAction<ArtifactEditorMode>>;
  onHighlightTarget: (target: ArtifactEditTarget) => void;
}) {
  return (
    <aside className="design-layer-panel" aria-label="Artifact layers">
      <div className="design-artifact-chip-list">
        {props.trackedArtifacts.slice(0, 4).map((artifact) => (
          <span key={artifact.path}>{artifact.path === "DESIGN/index.html" ? "DESIGN ENTRY" : artifact.title}</span>
        ))}
      </div>
      <label className="design-layer-search">
        <Search aria-hidden="true" />
        <input value={props.layerSearch} onChange={(event) => props.setLayerSearch(event.target.value)} placeholder="Search layers" />
      </label>
      <div className="design-layer-count">{props.filteredTargets.length} editable targets</div>
      <div className="design-layer-list" data-testid="artifact-layer-list" role="listbox" aria-label="Editable targets">
        {props.filteredTargets.length ? props.filteredTargets.map((target) => (
          <button
            type="button"
            key={target.id}
            role="option"
            aria-selected={props.selectedTarget?.id === target.id}
            className={cn("design-layer-button", props.selectedTarget?.id === target.id && "selected")}
            onMouseEnter={() => props.onHighlightTarget(target)}
            onClick={() => {
              props.setSelectedTarget(target);
              props.setArtifactMode("manual-edit");
              props.onHighlightTarget(target);
            }}
          >
            <span>{target.label}</span>
            <small>{target.tagName} · {target.kind} · {target.text || target.id}</small>
          </button>
        )) : (
          <div className="design-layer-empty">
            <strong>편집 가능한 요소가 없습니다</strong>
            <span>HTML에 data-od-id 또는 source path가 필요합니다.</span>
          </div>
        )}
      </div>
    </aside>
  );
}
