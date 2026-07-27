import { $createHeadingNode, type HeadingTagType } from '@lexical/rich-text';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $setBlocksType } from '@lexical/selection';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type SerializedEditorState,
} from 'lexical';
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Underline,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import { Button } from '@ui/components/ui/button';
import { cn } from '@ui/lib/utils';
import { richTextNodes, richTextTheme } from './rich-text/shared';

export interface RichTextInputProps {
  id?: string;
  /** Lexical editor state (object). Initializes the editor on mount. */
  value?: SerializedEditorState | null;
  onChange?: (value: SerializedEditorState) => void;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  className?: string;
}

const theme = richTextTheme;

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Toolbar() {
  const [editor] = useLexicalComposerContext();

  const formatText = (format: 'bold' | 'italic' | 'underline') =>
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);

  const formatHeading = (tag: HeadingTagType) =>
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(tag));
      }
    });

  const insertLink = () => {
    // eslint-disable-next-line no-alert -- minimal link UX; a popover editor is a future enhancement.
    const url = window.prompt('Link URL');
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url && url.trim() !== '' ? url.trim() : null);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/30 p-1"
      role="toolbar"
      aria-label="Formatting"
    >
      <ToolbarButton label="Bold" onClick={() => formatText('bold')}>
        <Bold className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Italic" onClick={() => formatText('italic')}>
        <Italic className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Underline" onClick={() => formatText('underline')}>
        <Underline className="size-4" aria-hidden />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <ToolbarButton label="Heading 1" onClick={() => formatHeading('h1')}>
        <Heading1 className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Heading 2" onClick={() => formatHeading('h2')}>
        <Heading2 className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton label="Heading 3" onClick={() => formatHeading('h3')}>
        <Heading3 className="size-4" aria-hidden />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <ToolbarButton
        label="Bullet list"
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
      >
        <List className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
      >
        <ListOrdered className="size-4" aria-hidden />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <ToolbarButton label="Link" onClick={insertLink}>
        <Link className="size-4" aria-hidden />
      </ToolbarButton>
    </div>
  );
}

/** Emit `SerializedEditorState` on edits, skipping the initial (mount-time) emit. */
function ChangePlugin({ onChange }: { onChange?: (value: SerializedEditorState) => void }) {
  const isFirst = useRef(true);
  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState) => {
        if (isFirst.current) {
          isFirst.current = false;
          return;
        }
        onChange?.(editorState.toJSON());
      }}
    />
  );
}

/** Keep the editor's editable state in sync with `disabled`. */
function EditablePlugin({ editable }: { editable: boolean }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(editable);
  }, [editor, editable]);
  return null;
}

/** A Lexical rich-text editor whose value is a `SerializedEditorState` object. */
export function RichTextInput({
  id,
  value,
  onChange,
  disabled = false,
  className,
  ...props
}: RichTextInputProps) {
  const ariaInvalid = props['aria-invalid'];
  const initialConfig = {
    namespace: 'rich-text-input',
    nodes: richTextNodes,
    theme,
    editable: !disabled,
    onError: (error: Error) => {
      throw error;
    },
    // Only seed an editor state from a REAL SerializedEditorState (has a `root`). An empty `{}`
    // (e.g. a default-seeded rich-text field) has no root, so Lexical would read `root.type` on
    // undefined and crash — treat it (and null/undefined) as an empty editor.
    ...(value && value.root ? { editorState: JSON.stringify(value) } : {}),
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-input bg-input/20 text-sm transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30',
        className,
      )}
      aria-invalid={ariaInvalid}
    >
      <LexicalComposer initialConfig={initialConfig}>
        <Toolbar />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                id={id}
                aria-invalid={ariaInvalid}
                className="min-h-28 px-3 py-2 outline-none [&_a]:cursor-pointer"
              />
            }
            placeholder={
              <div className="pointer-events-none absolute left-3 top-2 text-muted-foreground">
                Write…
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <ChangePlugin {...(onChange ? { onChange } : {})} />
        <EditablePlugin editable={!disabled} />
      </LexicalComposer>
    </div>
  );
}
