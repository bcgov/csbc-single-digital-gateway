import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import type { SerializedEditorState } from 'lexical';
import { useEffect } from 'react';
import { cn } from '@ui/lib/utils';
import { richTextNodes, richTextTheme } from './rich-text/shared';

export interface RichTextViewProps {
  /** The Lexical editor state to render. Renders nothing when null/undefined. */
  value?: SerializedEditorState | null;
  className?: string;
}

/**
 * Follows the `value` prop after mount.
 *
 * `LexicalComposer` reads `initialConfig` ONCE, on first mount, and ignores it on every later render — so
 * without this the view is frozen at whatever it was first given. It looked correct everywhere it was used
 * before (a page that loads content once), and broke the moment content was edited live beside it: the
 * Form Studio canvas never reflected a keystroke, while preview and re-entry did, because those remount it.
 */
function SyncPlugin({ serialized }: { serialized: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    // Compare against what the editor currently holds, so this never fights its own mount-time seed.
    if (JSON.stringify(editor.getEditorState().toJSON()) === serialized) return;
    editor.setEditorState(editor.parseEditorState(serialized));
  }, [editor, serialized]);
  return null;
}

/**
 * Read-only render of a Lexical `SerializedEditorState` — the display counterpart to
 * `RichTextInput`. No toolbar, no border, no editing: just the formatted content (shared node set +
 * theme keep it visually identical to the editor's output).
 */
export function RichTextView({ value, className }: RichTextViewProps) {
  // Render nothing for an empty value — including an empty `{}` (no `root`), which would otherwise
  // make Lexical read `root.type` on undefined and crash.
  if (!value || !value.root) {
    return null;
  }
  const serialized = JSON.stringify(value);
  const initialConfig = {
    namespace: 'rich-text-view',
    nodes: richTextNodes,
    theme: richTextTheme,
    editable: false,
    editorState: serialized,
    onError: (error: Error) => {
      throw error;
    },
  };
  return (
    <div
      data-slot="rich-text-view"
      className={cn('text-sm leading-relaxed [&_a]:cursor-pointer', className)}
    >
      <LexicalComposer initialConfig={initialConfig}>
        <SyncPlugin serialized={serialized} />
        <RichTextPlugin
          contentEditable={<ContentEditable readOnly className="outline-none" />}
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </LexicalComposer>
    </div>
  );
}
