import type { InlineEditableProps } from '../../types/elements';
import { InlineRichText } from './inline-rich-text';
import { InlineText } from './inline-text';

/**
 * Doc 223: the single inline editor the studio puts on the canvas.
 *
 * The VALUE'S TYPE picks the editor — a string is a single-line input, a rich text state a Lexical
 * one. One entry on the context rather than two, because every surface is asking the same question
 * ("edit this field of this element") and only the value differs; a second context would make each
 * renderer choose, which is exactly the knowledge they should not need.
 */
export function InlineValue(props: InlineEditableProps) {
  return typeof props.value === 'string' ? (
    <InlineText {...props} />
  ) : (
    <InlineRichText {...props} />
  );
}
