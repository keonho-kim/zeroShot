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
  selectedTargetIds: string[];
  setSelectedTarget: Dispatch<SetStateAction<ArtifactEditTarget | null>>;
  setArtifactMode: Dispatch<SetStateAction<ArtifactEditorMode>>;
  onToggleTargetSelection: (target: ArtifactEditTarget) => void;
  onHighlightTarget: (target: ArtifactEditTarget) => void;
}) {
  const selectedIds = new Set(props.selectedTargetIds);

  return (
    <aside className="design-layer-panel" aria-label="Artifact layers">
      <div className="design-artifact-chip-list">
        {props.trackedArtifacts.slice(0, 4).map((artifact) => (
          <span key={artifact.path}>{artifact.path === "DESIGN/index.html" ? "INTERACTIVE CANVAS" : artifact.title}</span>
        ))}
      </div>
      <label className="design-layer-search">
        <Search aria-hidden="true" />
        <input value={props.layerSearch} onChange={(event) => props.setLayerSearch(event.target.value)} placeholder="Search layers" />
      </label>
      <div className="design-layer-count">{props.filteredTargets.length} editable targets</div>
      <div className="design-layer-list" data-testid="artifact-layer-list" role="listbox" aria-label="Editable targets">
        {props.filteredTargets.length ? props.filteredTargets.map((target) => (
          <label
            key={target.id}
            role="option"
            aria-selected={selectedIds.has(target.id)}
            className={cn("design-layer-button", selectedIds.has(target.id) && "selected")}
            onMouseEnter={() => props.onHighlightTarget(target)}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(target.id)}
              onChange={() => {
                props.onToggleTargetSelection(target);
                props.setSelectedTarget(target);
                props.setArtifactMode("manual-edit");
                props.onHighlightTarget(target);
              }}
              aria-label={`Select ${target.label}`}
            />
            <span>{target.label}</span>
            <small>{target.tagName} · {target.kind} · {target.text || target.id}</small>
          </label>
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
