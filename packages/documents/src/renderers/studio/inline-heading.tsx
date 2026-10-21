import { Heading, type HeadingLevel } from '@repo/ui/heading';
import type { Ref } from 'react';
import { InlineEditableText } from './inline-text';

export { dragged, type Point } from './inline-text';

export interface InlineEditableHeadingProps {
  /** The stored text; empty shows `placeholder`, in the placeholder grey. */
  text: string;
  placeholder: string;
  level: HeadingLevel;
  size?: HeadingLevel | undefined;
  /** Classes the heading always carries, e.g. the Form title's weight. */
  className?: string;
  slot: string;
  /** Names the heading while it is being edited. */
  editLabel: string;
  /** Whether a click edits; otherwise the heading is plain text. */
  editable: boolean;
  /** The trimmed text, called only when it changed — `''` when cleared. */
  onCommit: (next: string) => void;
}

/**
 * A heading the author edits in place (doc 236 rules 23-25, 42b), shared by the studio Heading and Form title — the
 * shared `InlineEditableText` drawn as a `@repo/ui` Heading.
 */
export function InlineEditableHeading({ level, size, ...props }: InlineEditableHeadingProps) {
  return (
    <InlineEditableText
      {...props}
      render={({ ref, ...rest }) => (
        <Heading
          ref={ref as Ref<HTMLHeadingElement>}
          level={level}
          {...(size !== undefined && { size })}
          {...rest}
        />
      )}
    />
  );
}
