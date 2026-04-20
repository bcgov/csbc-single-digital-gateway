import { LinkNode } from "@lexical/link";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import {
  $createHeadingNode,
  HeadingNode,
  QuoteNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  IconBold,
  IconH1,
  IconH2,
  IconH3,
  IconIndentDecrease,
  IconIndentIncrease,
  IconItalic,
  IconList,
  IconListNumbers,
  IconStrikethrough,
  IconUnderline,
} from "@tabler/icons-react";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  type TextFormatType,
} from "lexical";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";

export interface RichTextInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  height?: string;
}

const theme = {
  paragraph: "mb-1",
  heading: {
    h1: "text-2xl font-bold mb-2",
    h2: "text-xl font-bold mb-2",
    h3: "text-lg font-semibold mb-1",
  },
  list: {
    ul: "list-disc ml-4 mb-1",
    ol: "list-decimal ml-4 mb-1",
    listitem: "mb-0.5",
    nested: {
      listitem: "list-none",
    },
  },
  quote:
    "border-l-4 border-muted-foreground/30 pl-3 italic text-muted-foreground",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "bg-muted px-1 py-0.5 rounded font-mono text-sm",
  },
  link: "text-primary underline",
};

function ToolbarButton({
  active,
  disabled,
  onClick,
  ariaLabel,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ToolbarPlugin({ disabled }: { disabled: boolean }) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat("bold"));
          setIsItalic(selection.hasFormat("italic"));
          setIsUnderline(selection.hasFormat("underline"));
          setIsStrikethrough(selection.hasFormat("strikethrough"));
        }
      });
    });
  }, [editor]);

  const formatText = useCallback(
    (format: TextFormatType) => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor],
  );

  const formatHeading = useCallback(
    (tag: HeadingTagType) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(tag));
        }
      });
    },
    [editor],
  );

  const formatParagraph = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  }, [editor]);

  const iconSize = 16;

  return (
    <div
      className="border-input flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1"
      role="toolbar"
      aria-label="Text formatting"
    >
      <ToolbarButton
        active={isBold}
        disabled={disabled}
        onClick={() => formatText("bold")}
        ariaLabel="Bold"
      >
        <IconBold size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={isItalic}
        disabled={disabled}
        onClick={() => formatText("italic")}
        ariaLabel="Italic"
      >
        <IconItalic size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={isUnderline}
        disabled={disabled}
        onClick={() => formatText("underline")}
        ariaLabel="Underline"
      >
        <IconUnderline size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        active={isStrikethrough}
        disabled={disabled}
        onClick={() => formatText("strikethrough")}
        ariaLabel="Strikethrough"
      >
        <IconStrikethrough size={iconSize} />
      </ToolbarButton>

      <div className="bg-border mx-1 h-5 w-px" />

      <ToolbarButton
        disabled={disabled}
        onClick={() => formatHeading("h1")}
        ariaLabel="Heading 1"
      >
        <IconH1 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => formatHeading("h2")}
        ariaLabel="Heading 2"
      >
        <IconH2 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => formatHeading("h3")}
        ariaLabel="Heading 3"
      >
        <IconH3 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => formatParagraph()}
        ariaLabel="Normal text"
      >
        <span className="text-xs font-medium">P</span>
      </ToolbarButton>

      <div className="bg-border mx-1 h-5 w-px" />

      <ToolbarButton
        disabled={disabled}
        onClick={() =>
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
        ariaLabel="Bullet list"
      >
        <IconList size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
        ariaLabel="Numbered list"
      >
        <IconListNumbers size={iconSize} />
      </ToolbarButton>

      <div className="bg-border mx-1 h-5 w-px" />

      <ToolbarButton
        disabled={disabled}
        onClick={() =>
          editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)
        }
        ariaLabel="Decrease indent"
      >
        <IconIndentDecrease size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() =>
          editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)
        }
        ariaLabel="Increase indent"
      >
        <IconIndentIncrease size={iconSize} />
      </ToolbarButton>
    </div>
  );
}

function JsonImportPlugin({ json }: { json: string | undefined }) {
  const [editor] = useLexicalComposerContext();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    if (!json) return;

    const parsed = editor.parseEditorState(json);
    editor.setEditorState(parsed);
  }, [editor, json, initialized]);

  return null;
}

function OnChangePlugin({
  onChange,
}: {
  onChange: (value: string | undefined) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const text = $getRoot().getTextContent().trim();
        if (!text) {
          onChangeRef.current(undefined);
          return;
        }
        const json = JSON.stringify(editorState.toJSON());
        onChangeRef.current(json);
      });
    });
  }, [editor]);

  return null;
}

function ReadOnlyPlugin({ disabled }: { disabled: boolean }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  return null;
}

export function RichTextInput({
  value,
  onChange,
  placeholder = "Enter text...",
  className,
  disabled = false,
  height = "200px",
}: RichTextInputProps) {
  const initialConfig = useMemo(
    () => ({
      namespace: "RichTextInput",
      theme,
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
      onError(error: Error) {
        console.error("RichTextInput error:", error);
      },
      editable: !disabled,
    }),
    // Only run on mount — don't recreate editor on prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        className={cn(
          "border-input bg-background overflow-hidden rounded-md border",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
          disabled && "opacity-50",
          className,
        )}
      >
        <ToolbarPlugin disabled={disabled} />
        <div className="relative" style={{ minHeight: height }}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="prose prose-sm dark:prose-invert max-w-none px-3 py-2 text-sm outline-none"
                style={{ minHeight: height }}
                aria-placeholder={placeholder}
                placeholder={<div>{placeholder}</div>}
              />
            }
            placeholder={
              <div className="text-muted-foreground pointer-events-none absolute left-3 top-2 text-sm">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <TabIndentationPlugin />
        <JsonImportPlugin json={value} />
        <OnChangePlugin onChange={onChange} />
        <ReadOnlyPlugin disabled={disabled} />
      </div>
    </LexicalComposer>
  );
}
