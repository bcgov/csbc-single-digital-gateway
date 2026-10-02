import { RichTextInput } from '@repo/ui/rich-text-input';
import { RichTextView } from '@repo/ui/rich-text-view';
import { useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { richTextHasText, type RichTextState } from '../ui/rich-text-value';
import { dragged, type Point } from './inline-heading';
import { STUDIO_INTERACTIVE } from './studio-element';

export interface InlineRichTextProps {
  /** The stored content; without text, editable shows `placeholder` and view-only shows nothing. */
  value: RichTextState | undefined;
  placeholder: string;
  /** Names the editor. */
  label: string;
  slot: string;
  /** Whether a click edits; otherwise the content is read-only. */
  editable: boolean;
  /** Every change — `undefined` when the editor holds no text. */
  onChange: (state: RichTextState | undefined) => void;
  /** Classes on both modes, e.g. the description's muted colour. */
  className?: string;
}

/**
 * Space between the toolbar and the text (doc 251 rule 5b). A `bare` editor has no content inset, so the text would sit
 * on the toolbar's rule; a margin on the TOOLBAR moves the content and its overlaid placeholder together.
 */
export const TOOLBAR_GAP = '[&_[data-slot=rich-text-toolbar]]:mb-2';

/**
 * Rich content edited in place (doc 250 rules 8-11, doc 251 rule 5), shared by the studio Rich content and the Form
 * description: the read-only view — a grey placeholder when empty — until one click that is not a drag opens a bare
 * editor with the toolbar, focused. Every change is reported; Escape or focus leaving it returns to the view. The
 * toolbar is inside, so using it never closes the editor. Writing per change is loop-free: `RichTextInput` never
 * re-seeds while focused and never reports a synced value.
 */
export function InlineRichText({
  value,
  placeholder,
  label,
  slot,
  editable,
  onChange,
  className = '',
}: InlineRichTextProps) {
  const [editing, setEditing] = useState(false);
  const pressedAt = useRef<Point | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const open = editing && editable;

  useLayoutEffect(() => {
    if (open) box.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus();
  }, [open]);

  if (open) {
    return (
      <div
        ref={box}
        data-slot={slot}
        data-editing=""
        className={`${className} ${STUDIO_INTERACTIVE} ${TOOLBAR_GAP}`.trim()}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          setEditing(false);
        }}
        onBlur={(event: FocusEvent<HTMLDivElement>) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setEditing(false);
        }}
      >
        <RichTextInput
          bare
          value={value ?? null}
          placeholder={placeholder}
          aria-label={label}
          className="text-sm leading-relaxed"
          onChange={(state) => onChange(richTextHasText(state) ? state : undefined)}
        />
      </div>
    );
  }
  const empty = !richTextHasText(value);
  if (empty && !editable) return null;
  return (
    <div
      data-slot={slot}
      data-placeholder={empty ? '' : undefined}
      className={`${className} ${editable ? `cursor-text ${STUDIO_INTERACTIVE}` : ''}`.trim()}
      onPointerDown={(event) => {
        pressedAt.current = { x: event.clientX, y: event.clientY };
      }}
      onClick={(event) => {
        if (editable && !dragged(pressedAt.current, event)) setEditing(true);
      }}
    >
      {empty ? (
        <p className="text-sm text-placeholder">{placeholder}</p>
      ) : (
        <RichTextView value={value ?? null} />
      )}
    </div>
  );
}
