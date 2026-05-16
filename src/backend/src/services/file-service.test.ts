import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import { readArtifactManifest, readProductHtmlSnapshot, upsertArtifactManifest, writeProductHtmlSnapshot } from "@backend/services/file-service";

describe("file service artifacts", () => {
  test("persists artifact manifest entries and rejects unsafe paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "zeroshot-artifacts-"));
    try {
      await upsertArtifactManifest(root, [
        { path: "PRODUCT.html", type: "text/html", title: "Product", entry: true }
      ]);
      await upsertArtifactManifest(root, [
        { path: "DESIGN.md", type: "text/markdown", title: "Design brief" }
      ]);

      const manifest = await readArtifactManifest(root);

      expect(manifest.artifacts.map((artifact) => artifact.path)).toEqual(["DESIGN.md", "PRODUCT.html"]);
      expect(manifest.artifacts.find((artifact) => artifact.path === "PRODUCT.html")?.entry).toBe(true);
      await expect(upsertArtifactManifest(root, [
        { path: "../secret.txt", type: "text/plain", title: "Secret" }
      ])).rejects.toThrow("Invalid artifact path");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("guards product artifact writes with an etag", async () => {
    const root = await mkdtemp(join(tmpdir(), "zeroshot-artifact-etag-"));
    try {
      const first = await writeProductHtmlSnapshot(root, "<!doctype html><html><body>One</body></html>");
      const loaded = await readProductHtmlSnapshot(root);

      expect(loaded.etag).toBe(first.etag);

      const second = await writeProductHtmlSnapshot(root, "<!doctype html><html><body>Two</body></html>", loaded.etag);

      await expect(writeProductHtmlSnapshot(root, "<!doctype html><html><body>Three</body></html>", loaded.etag))
        .rejects
        .toThrow("PRODUCT BLUEPRINT changed since it was loaded.");
      expect(second.etag).not.toBe(loaded.etag);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
