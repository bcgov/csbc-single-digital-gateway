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
  mdiFormatBold,
  mdiFormatHeader1,
  mdiFormatHeader2,
  mdiFormatHeader3,
  mdiFormatItalic,
  mdiLink,
  mdiFormatListBulleted,
  mdiFormatListNumbered,
  mdiFormatUnderline,
} from '@mdi/js';
import { Icon } from '@mdi/react';
import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react';
import { Button } from '@ui/components/ui/button';
import { cn } from '@ui/lib/utils';
import { richTextNodes, richTextTheme } from './rich-text/shared';

/**
 * The toolbar features an author may ask for, in the order the toolbar draws them (doc 207 rule 11).
 * `heading` is ONE feature covering H1-H3: they are one decision to an author, not three.
 *
 * Exported so `@repo/forms` can sanitise `uischema.options.toolbar` against the SAME list — a second copy
 * would drift from the one the toolbar actually honours.
 */
export const RICH_TEXT_FEATURES = [
  'bold',
  'italic',
  'underline',
  'heading',
  'bulletList',
  'numberedList',
  'link',
] as const;

export type RichTextFeature = (typeof RICH_TEXT_FEATURES)[number];

/** The features that report an active state (rule 16). Block-level ones do not — see `Toolbar`. */
const INLINE_FORMATS = ['bold', 'italic', 'underline'] as const;
type InlineFormat = (typeof INLINE_FORMATS)[number];

export interface RichTextInputProps {
  id?: string;
  /** Lexical editor state (object). Initializes the editor on mount. */
  value?: SerializedEditorState | null;
  onChange?: (value: SerializedEditorState) => void;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  /**
   * The editor is a Lexical `ContentEditable` — a `div`, which `<label for>` cannot name. Pass
   * `aria-label` or `aria-labelledby` (preferred when a visible caption exists) so the editor has
   * an accessible name, and `aria-describedby` to link supporting description/error text.
   */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string | undefined;
  className?: string;
  /**
   * Which toolbar features to offer. Absent means all of them; an EMPTY array means a toolbar-less
   * editor, which is a different thing from "the default".
   */
  toolbar?: readonly RichTextFeature[];
  /** Empty-state text. Defaults to "Write…". */
  placeholder?: string;
  /** Minimum height in lines. Absent keeps the built-in minimum. */
  rows?: number;
}

const theme = richTextTheme;

function ToolbarButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  /**
   * Rule 16: only the INLINE formats report an active state. A heading or list button cannot know its
   * block type without more tracking, and a button reporting a STALE pressed state would be worse than
   * one reporting none — so those pass `undefined` and expose no `aria-pressed` at all.
   */
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7"
      aria-label={label}
      {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

const ToolbarSeparator = () => (
  <span data-slot="rich-text-toolbar-separator" className="mx-1 h-5 w-px bg-border" aria-hidden />
);

/** Rule 16: which inline formats the current selection carries. */
function useActiveFormats(): Record<InlineFormat, boolean> {
  const [editor] = useLexicalComposerContext();
  const [active, setActive] = useState<Record<InlineFormat, boolean>>({
    bold: false,
    italic: false,
    underline: false,
  });

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;
          const next = {
            bold: selection.hasFormat('bold'),
            italic: selection.hasFormat('italic'),
            underline: selection.hasFormat('underline'),
          };
          // A new object every update would re-render on every keystroke — React bails out on Object.is only.
          setActive((current) =>
            INLINE_FORMATS.every((format) => current[format] === next[format]) ? current : next,
          );
        });
      }),
    [editor],
  );

  return active;
}

function Toolbar({ features }: { features: readonly RichTextFeature[] }) {
  const [editor] = useLexicalComposerContext();
  const active = useActiveFormats();
  const offers = (feature: RichTextFeature) => features.includes(feature);

  const formatText = (format: InlineFormat) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);

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

  const inlineIcons: Record<InlineFormat, string> = {
    bold: mdiFormatBold,
    italic: mdiFormatItalic,
    underline: mdiFormatUnderline,
  };
  const inlineLabels: Record<InlineFormat, string> = {
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
  };
  const headings: [HeadingTagType, string, string][] = [
    ['h1', 'Heading 1', mdiFormatHeader1],
    ['h2', 'Heading 2', mdiFormatHeader2],
    ['h3', 'Heading 3', mdiFormatHeader3],
  ];

  /**
   * Rule 11: drawn in the TOOLBAR's order, not the author's — a toolbar whose buttons move about between
   * fields would be harder to use, and the author is choosing WHICH features, not where they sit.
   * Groups are assembled first so a separator is only drawn BETWEEN two groups that both have content.
   */
  const groups: ReactNode[][] = [
    INLINE_FORMATS.filter(offers).map((format) => (
      <ToolbarButton
        key={format}
        label={inlineLabels[format]}
        pressed={active[format]}
        onClick={() => formatText(format)}
      >
        <Icon path={inlineIcons[format]} size="16px" aria-hidden />
      </ToolbarButton>
    )),
    offers('heading')
      ? headings.map(([tag, label, icon]) => (
          <ToolbarButton key={tag} label={label} onClick={() => formatHeading(tag)}>
            <Icon path={icon} size="16px" aria-hidden />
          </ToolbarButton>
        ))
      : [],
    [
      offers('bulletList') ? (
        <ToolbarButton
          key="bulletList"
          label="Bullet list"
          onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        >
          <Icon path={mdiFormatListBulleted} size="16px" aria-hidden />
        </ToolbarButton>
      ) : null,
      offers('numberedList') ? (
        <ToolbarButton
          key="numberedList"
          label="Numbered list"
          onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        >
          <Icon path={mdiFormatListNumbered} size="16px" aria-hidden />
        </ToolbarButton>
      ) : null,
    ].filter(Boolean) as ReactNode[],
    offers('link')
      ? [
          <ToolbarButton key="link" label="Link" onClick={insertLink}>
            <Icon path={mdiLink} size="16px" aria-hidden />
          </ToolbarButton>,
        ]
      : [],
  ];

  const filled = groups.filter((group) => group.length > 0);

  return (
    <div
      data-slot="rich-text-toolbar"
      className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/30 p-1"
      role="toolbar"
      aria-label="Formatting"
    >
      {filled.map((group, index) => (
        // eslint-disable-next-line react/no-array-index-key -- groups are a fixed, ordered set
        <Fragment key={index}>
          {index > 0 ? <ToolbarSeparator /> : null}
          {group}
        </Fragment>
      ))}
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
  toolbar,
  placeholder = 'Write…',
  rows,
  ...props
}: RichTextInputProps) {
  const ariaInvalid = props['aria-invalid'];
  // The ContentEditable is a `div`, so `<label for>` cannot name it — forward the aria hooks instead.
  const ariaLabel = props['aria-label'];
  const ariaLabelledBy = props['aria-labelledby'];
  const ariaDescribedBy = props['aria-describedby'];
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

  const features = toolbar ?? RICH_TEXT_FEATURES;

  return (
    <div
      data-slot="rich-text-input"
      className={cn(
        'overflow-hidden rounded-md border border-input bg-input-background text-sm transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
        className,
      )}
      aria-invalid={ariaInvalid}
    >
      <LexicalComposer initialConfig={initialConfig}>
        {/* Rule 11: an EMPTY list is a toolbar-less editor; ABSENT is all of them. */}
        {features.length > 0 ? <Toolbar features={features} /> : null}
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                id={id}
                aria-invalid={ariaInvalid}
                {...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
                {...(ariaLabelledBy === undefined ? {} : { 'aria-labelledby': ariaLabelledBy })}
                {...(ariaDescribedBy === undefined ? {} : { 'aria-describedby': ariaDescribedBy })}
                data-slot="rich-text-content"
                className="min-h-28 px-3 py-2 outline-none [&_a]:cursor-pointer"
                {...(rows === undefined ? {} : { style: { minHeight: `${rows}lh` } })}
              />
            }
            placeholder={
              <div className="pointer-events-none absolute top-2 left-3 text-muted-foreground">
                {placeholder}
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
