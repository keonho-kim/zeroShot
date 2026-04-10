import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

let configured = false;

export function setupMonaco(): void {
  if (configured) {
    return;
  }
  configured = true;

  self.MonacoEnvironment = {
    getWorker(_, label) {
      if (label === "json") {
        return new jsonWorker();
      }
      if (label === "css" || label === "scss" || label === "less") {
        return new cssWorker();
      }
      if (label === "html" || label === "handlebars" || label === "razor") {
        return new htmlWorker();
      }
      if (label === "typescript" || label === "javascript") {
        return new tsWorker();
      }
      return new editorWorker();
    }
  };

  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

  monaco.editor.defineTheme("one-dark-soft", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5c6370" },
      { token: "keyword", foreground: "c678dd" },
      { token: "string", foreground: "98c379" },
      { token: "number", foreground: "d19a66" },
      { token: "type", foreground: "e5c07b" },
      { token: "type.identifier", foreground: "e5c07b" },
      { token: "class", foreground: "e5c07b" },
      { token: "function", foreground: "61afef" },
      { token: "tag", foreground: "e06c75" },
      { token: "attribute.name", foreground: "d19a66" },
      { token: "attribute.value", foreground: "98c379" },
      { token: "regexp", foreground: "56b6c2" }
    ],
    colors: {
      "editor.background": "#282c34",
      "editor.foreground": "#abb2bf",
      "editorCursor.foreground": "#528bff",
      "editor.lineHighlightBackground": "#2c313a",
      "editor.selectionBackground": "#3e4451",
      "editor.inactiveSelectionBackground": "#323842",
      "editorIndentGuide.background1": "#3e445155",
      "editorIndentGuide.activeBackground1": "#82899799",
      "editorWhitespace.foreground": "#4b5360",
      "editorLineNumber.foreground": "#5c6370",
      "editorLineNumber.activeForeground": "#828997",
      "editorGutter.background": "#282c34",
      "editorWidget.background": "#353a42",
      "editorWidget.border": "#3f4652",
      "editorHoverWidget.background": "#353a42",
      "editorHoverWidget.border": "#3f4652",
      "editorSuggestWidget.background": "#353a42",
      "editorSuggestWidget.foreground": "#abb2bf",
      "editorSuggestWidget.selectedBackground": "#3e4451",
      "editorSuggestWidget.highlightForeground": "#61afef",
      "editor.findMatchBackground": "#72a1ff59",
      "editor.findMatchBorder": "#457dff",
      "editor.findMatchHighlightBackground": "#6199ff2f",
      "scrollbarSlider.background": "#3e445166",
      "scrollbarSlider.hoverBackground": "#4b5366aa",
      "scrollbarSlider.activeBackground": "#5a6479cc"
    }
  });

  monaco.editor.setTheme("one-dark-soft");
}
