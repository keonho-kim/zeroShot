export type ArtifactEditorMode = "preview" | "manual-edit" | "inspect" | "source";
export type ArtifactViewport = "desktop" | "tablet" | "mobile";
export type ArtifactEditorTab = "content" | "style" | "attributes" | "html" | "source";
export type ManualEditKind = "text" | "link" | "image" | "container" | "token";

export interface ArtifactEditRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArtifactEditFields {
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
}

export interface ArtifactEditStyles {
  color: string;
  backgroundColor: string;
  fontSize: string;
  fontWeight: string;
  textAlign: string;
  padding: string;
  margin: string;
  borderRadius: string;
  border: string;
  width: string;
  minHeight: string;
  transform: string;
}

export interface ArtifactEditTarget {
  id: string;
  kind: ManualEditKind;
  label: string;
  tagName: string;
  className: string;
  text: string;
  rect: ArtifactEditRect;
  fields: ArtifactEditFields;
  attributes: Record<string, string>;
  styles: ArtifactEditStyles;
  outerHtml: string;
}

export type ArtifactBridgeMessage =
  | { __zeroshotArtifact: true; type: "od-preview-ready" }
  | { __zeroshotArtifact: true; type: "od-edit-targets"; targets: ArtifactEditTarget[] }
  | { __zeroshotArtifact: true; type: "od-edit-select"; target: ArtifactEditTarget; additive?: boolean }
  | { __zeroshotArtifact: true; type: "od-edit-hover"; target: ArtifactEditTarget | null }
  | { __zeroshotArtifact: true; type: "od-edit-drag"; target: ArtifactEditTarget; deltaX: number; deltaY: number }
  | { __zeroshotArtifact: true; type: "od-edit-key-input"; target: ArtifactEditTarget; key: string };

export type ArtifactSourcePatch =
  | { kind: "set-full-source"; source: string }
  | { kind: "set-token"; token: string; value: string }
  | { kind: "set-text"; id: string; value: string }
  | { kind: "set-link"; id: string; text: string; href: string }
  | { kind: "set-image"; id: string; src: string; alt: string }
  | { kind: "set-style"; id: string; styles: Partial<ArtifactEditStyles> }
  | { kind: "set-attributes"; id: string; attributes: Record<string, string> }
  | { kind: "set-outer-html"; id: string; html: string };

export interface ArtifactHistoryEntry {
  id: string;
  label: string;
  patch: ArtifactSourcePatch;
  beforeSource: string;
  afterSource: string;
  createdAt: number;
}
