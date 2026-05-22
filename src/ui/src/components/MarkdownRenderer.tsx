import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { useEffect } from "react";

function MarkdownSyncPlugin({ markdown }: { markdown: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      $convertFromMarkdownString(markdown || " ", TRANSFORMERS, undefined, true);
    });
  }, [editor, markdown]);

  return null;
}

export function MarkdownRenderer({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <LexicalComposer
      initialConfig={{
        editable: false,
        namespace: "ZeroShotMarkdownRenderer",
        nodes: [AutoLinkNode, CodeNode, HeadingNode, LinkNode, ListItemNode, ListNode, QuoteNode],
        onError(error) {
          throw error;
        },
        theme: {
          code: "markdown-renderer-code-block",
          heading: {
            h1: "markdown-renderer-heading markdown-renderer-heading-1",
            h2: "markdown-renderer-heading markdown-renderer-heading-2",
            h3: "markdown-renderer-heading markdown-renderer-heading-3",
            h4: "markdown-renderer-heading markdown-renderer-heading-4",
            h5: "markdown-renderer-heading markdown-renderer-heading-5",
            h6: "markdown-renderer-heading markdown-renderer-heading-6"
          },
          link: "markdown-renderer-link",
          list: {
            listitem: "markdown-renderer-list-item",
            nested: {
              listitem: "markdown-renderer-nested-list-item"
            },
            ol: "markdown-renderer-list markdown-renderer-list-ordered",
            ul: "markdown-renderer-list markdown-renderer-list-unordered"
          },
          paragraph: "markdown-renderer-paragraph",
          quote: "markdown-renderer-quote",
          text: {
            bold: "markdown-renderer-bold",
            code: "markdown-renderer-inline-code",
            italic: "markdown-renderer-italic",
            strikethrough: "markdown-renderer-strikethrough"
          }
        }
      }}
    >
      <div className={["markdown-renderer", className].filter(Boolean).join(" ")}>
        <RichTextPlugin
          contentEditable={<ContentEditable className="markdown-renderer-content" aria-label="Markdown content" />}
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <MarkdownSyncPlugin markdown={markdown} />
      </div>
    </LexicalComposer>
  );
}
