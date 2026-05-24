import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { EditorState } from "lexical";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type LexicalEditor
} from "lexical";
import { useEffect, useRef } from "react";
import { Button } from "@/shared/ui/button";

const snippets = [
  { label: "@file", value: "@file:" },
  { label: "@symbol", value: "@symbol:" },
  { label: "/command", value: "/build " },
  { label: "artifact", value: '<artifact path="ARCHITECT/PRODUCT.html">' },
  { label: "diff comment", value: "diff-comment: " },
  { label: "block", value: "\n\n---\n\n" }
];

function writePlainText(text: string) {
  const root = $getRoot();
  root.clear();
  const blocks = text.split(/\n{2,}/);

  for (const block of blocks.length ? blocks : [""]) {
    const paragraph = $createParagraphNode();
    paragraph.append($createTextNode(block));
    root.append(paragraph);
  }
}

function insertSnippet(editor: LexicalEditor, text: string) {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      selection.insertText(text);
      return;
    }

    const root = $getRoot();
    const paragraph = $createParagraphNode();
    paragraph.append($createTextNode(text));
    root.append(paragraph);
  });
}

function PlainTextSyncPlugin({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [editor] = useLexicalComposerContext();
  const lastValueRef = useRef(value);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current && value === lastValueRef.current) {
      return;
    }

    initializedRef.current = true;
    lastValueRef.current = value;
    editor.update(() => writePlainText(value));
  }, [editor, value]);

  function handleChange(editorState: EditorState) {
    editorState.read(() => {
      const text = $getRoot().getTextContent();
      lastValueRef.current = text;
      onChange(text);
    });
  }

  return <OnChangePlugin onChange={handleChange} />;
}

function PromptToolbar() {
  const [editor] = useLexicalComposerContext();

  return (
    <div className="prompt-editor-toolbar">
      {snippets.map((snippet) => (
        <Button key={snippet.label} type="button" variant="outline" className="h-8 px-3 py-1 text-xs" onClick={() => insertSnippet(editor, snippet.value)}>
          {snippet.label}
        </Button>
      ))}
    </div>
  );
}

export function RichPromptEditor({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: `ZeroShotPrompt:${label}`,
        nodes: [AutoLinkNode, CodeNode, LinkNode, ListItemNode, ListNode],
        onError(error) {
          throw error;
        },
        theme: {
          paragraph: "prompt-editor-paragraph"
        }
      }}
    >
      <div className="prompt-editor" aria-label={label}>
        <PromptToolbar />
        <div className="prompt-editor-body">
          <RichTextPlugin
            contentEditable={<ContentEditable className="prompt-editor-input" />}
            placeholder={<div className="prompt-editor-placeholder">{placeholder}</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <PlainTextSyncPlugin value={value} onChange={onChange} />
        </div>
      </div>
    </LexicalComposer>
  );
}
