export interface ArtifactManifestEntry {
  path: string;
  type: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  entry?: boolean;
}

export interface ArtifactManifest {
  artifacts: ArtifactManifestEntry[];
}

export interface ProjectFileSnapshot {
  path: string;
  content: string;
  mime: string;
  etag: string;
  updatedAt: string;
}
