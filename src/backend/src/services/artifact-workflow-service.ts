import { appendAppEvent } from "@backend/services/event-log-service";
import { designEntryPath, readProductHtmlSnapshot, upsertArtifactManifest, writeArtifactFile } from "@backend/services/file-service";
import { recordDesignSession } from "@backend/services/app-storage-service";
import type { ArchitectProductFile } from "@backend/services/architect-service";
import type { DesignRuntimeMode, DesignRuntimeResponse } from "@backend/types/design";

export async function saveArchitectProductFiles(projectRoot: string, files: ArchitectProductFile[]) {
  for (const file of files) {
    if (file.path !== "ARCHITECT/PRODUCT.html"
      && !file.path.startsWith("ARCHITECT/pages/")
      && !file.path.startsWith("ARCHITECT/components/")
      && !file.path.startsWith("ARCHITECT/assets/")) {
      throw new Error(`Architect product returned a file outside ARCHITECT/: ${file.path}`);
    }
    await writeArtifactFile(projectRoot, file.path, file.content);
  }

  const entry = await readProductHtmlSnapshot(projectRoot);
  await upsertArtifactManifest(projectRoot, files.map((file) => ({
    path: file.path,
    type: file.type,
    title: file.title,
    entry: file.path === "ARCHITECT/PRODUCT.html"
  })));
  await appendAppEvent("product_artifact_saved", {
    projectRoot,
    path: entry.path,
    etag: entry.etag
  });
  return entry;
}

export async function saveDesignRuntimeArtifacts(projectRoot: string, mode: DesignRuntimeMode, design: DesignRuntimeResponse) {
  for (const file of design.files) {
    if (!file.path.startsWith("DESIGN/")) {
      throw new Error(`Design runtime returned a file outside DESIGN/: ${file.path}`);
    }
    await writeArtifactFile(projectRoot, file.path, file.content);
  }

  await writeArtifactFile(projectRoot, "DESIGN/runtime.json", `${JSON.stringify(design, null, 2)}\n`);
  await upsertArtifactManifest(projectRoot, [
    ...design.artifacts.map((artifact) => ({
      path: artifact.path,
      type: artifact.type,
      title: artifact.title,
      entry: artifact.path === designEntryPath
    })),
    ...design.files.map((file) => ({
      path: file.path,
      type: file.type,
      title: file.title,
      entry: file.path === designEntryPath
    }))
  ]);
  await recordDesignSession(design);
  await appendAppEvent("design_runtime_created", {
    projectRoot,
    mode,
    designId: design.id,
    title: design.title
  });
  return design;
}
