import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import type { SerializedEditorState } from 'lexical';
import { cn } from '@ui/lib/utils';
import { richTextNodes, richTextTheme } from './rich-text/shared';

export interface RichTextViewProps {
  /** The Lexical editor state to render. Renders nothing when null/undefined. */
  value?: SerializedEditorState | null;
  className?: string;
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
  const initialConfig = {
    namespace: 'rich-text-view',
    nodes: richTextNodes,
    theme: richTextTheme,
    editable: false,
    editorState: JSON.stringify(value),
    onError: (error: Error) => {
      throw error;
    },
  };
  return (
    <div className={cn('text-sm leading-relaxed [&_a]:cursor-pointer', className)}>
      <LexicalComposer initialConfig={initialConfig}>
        <RichTextPlugin
          contentEditable={<ContentEditable readOnly className="outline-none" />}
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </LexicalComposer>
    </div>
  );
}
