import { describe, expect, test } from "bun:test";
import {
  createDefaultArtifactHtml,
  isArtifactBridgeMessage,
  nextTextFromKey,
  translatedStyle
} from "@/entities/design/artifact-editor";

describe("artifact editor core", () => {
  test("creates an editable HTML artifact with stable ids", () => {
    const html = createDefaultArtifactHtml("Demo");

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("data-od-id=\"artifact-title\"");
    expect(html).toContain("Demo");
  });

  test("turns natural key input into text edits", () => {
    expect(nextTextFromKey("Demo", "x")).toBe("Demox");
    expect(nextTextFromKey("Demo", "Backspace")).toBe("Dem");
    expect(nextTextFromKey("Demo", "Enter")).toBe("Demo\n");
  });

  test("accumulates drag offsets as translate styles", () => {
    expect(translatedStyle(undefined, 12.4, -4.1)).toBe("translate(12px, -4px)");
    expect(translatedStyle("color: red; transform: translate(10px, 5px)", 3, 2)).toBe("translate(13px, 7px)");
  });

  test("accepts only artifact bridge messages", () => {
    expect(isArtifactBridgeMessage({ __zeroshotArtifact: true, type: "od-preview-ready" })).toBe(true);
    expect(isArtifactBridgeMessage({ type: "od-preview-ready" })).toBe(false);
  });
});
