import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { ArtifactViewport } from "@/pages/design/artifact-workbench/types";
import { cn } from "@/utils/cn";

const viewportOptions = [
  { id: "desktop", icon: <Monitor aria-hidden="true" />, label: "Desktop" },
  { id: "tablet", icon: <Tablet aria-hidden="true" />, label: "Tablet" },
  { id: "mobile", icon: <Smartphone aria-hidden="true" />, label: "Mobile" }
] satisfies Array<{ id: ArtifactViewport; icon: ReactNode; label: string }>;

export function ArtifactToolbar(props: {
  artifactViewport: ArtifactViewport;
  setArtifactViewport: Dispatch<SetStateAction<ArtifactViewport>>;
  artifactZoom: number;
  setArtifactZoom: Dispatch<SetStateAction<number>>;
}) {
  return (
    <div className="design-editor-toolbar" aria-label="Artifact editor toolbar">
      <div className="design-segmented-control" aria-label="Viewport">
        {viewportOptions.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={props.artifactViewport === item.id}
            className={cn(props.artifactViewport === item.id && "selected")}
            onClick={() => props.setArtifactViewport(item.id)}
            title={item.label}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="design-zoom-control">
        <button type="button" onClick={() => props.setArtifactZoom(1)}>
          Fit
        </button>
        <span>Zoom</span>
        <input
          type="range"
          min="0.5"
          max="1.25"
          step="0.05"
          value={props.artifactZoom}
          onChange={(event) => props.setArtifactZoom(Number(event.target.value))}
        />
        <strong>{Math.round(props.artifactZoom * 100)}%</strong>
      </div>
    </div>
  );
}
