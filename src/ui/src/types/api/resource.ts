export interface ResourceFileSummary {
  path: string;
  kind: "reference" | "asset" | "example" | "other";
  size: number;
}

export interface ResourceManifest {
  id: string;
  name: string;
  description: string;
  category?: string;
  tags: string[];
  root: string;
  manifestPath: string;
  body: string;
  files: ResourceFileSummary[];
}
