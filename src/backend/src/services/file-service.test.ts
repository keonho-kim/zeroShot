import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import { readArtifactManifest, readDesignHtmlSnapshot, readProductHtmlSnapshot, upsertArtifactManifest, writeDesignHtmlSnapshot, writeProductHtmlSnapshot } from "@backend/services/file-service";

describe("file service artifacts", () => {
  test("persists artifact manifest entries and rejects unsafe paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "zeroshot-artifacts-"));
    try {
      await upsertArtifactManifest(root, [
        { path: "ARCHITECT/PRODUCT.html", type: "text/html", title: "Product", entry: true }
      ]);
      await upsertArtifactManifest(root, [
        { path: "DESIGN/index.html", type: "text/html", title: "Design" }
      ]);

      const manifest = await readArtifactManifest(root);

      expect(manifest.artifacts.map((artifact) => artifact.path)).toEqual(["ARCHITECT/PRODUCT.html", "DESIGN/index.html"]);
      expect(manifest.artifacts.find((artifact) => artifact.path === "ARCHITECT/PRODUCT.html")?.entry).toBe(true);
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

  test("guards design artifact writes with an etag", async () => {
    const root = await mkdtemp(join(tmpdir(), "zeroshot-design-artifact-"));
    try {
      const first = await writeDesignHtmlSnapshot(root, "<!doctype html><html><body>One</body></html>");
      const loaded = await readDesignHtmlSnapshot(root);

      expect(loaded.path).toBe("DESIGN/index.html");
      expect(loaded.etag).toBe(first.etag);

      await writeDesignHtmlSnapshot(root, "<!doctype html><html><body>Two</body></html>", loaded.etag);
      await expect(writeDesignHtmlSnapshot(root, "<!doctype html><html><body>Three</body></html>", loaded.etag))
        .rejects
        .toThrow("DESIGN artifact changed since it was loaded.");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
