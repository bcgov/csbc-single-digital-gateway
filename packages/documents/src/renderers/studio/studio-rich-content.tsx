import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { RichTextInput } from '@repo/ui/rich-text-input';
import { RichTextView } from '@repo/ui/rich-text-view';
import { useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { richContentOf } from '../ui/rich-content-renderer';
import { richTextHasText, type RichTextState } from '../ui/rich-text-value';
import { dragged, type Point } from './inline-heading';
import { useStudioEditor } from './studio-editor';
import { STUDIO_INTERACTIVE, useStudioElement } from './studio-element';

/** Outranks the spread ui Rich content (doc 250 rule 7). */
export const studioRichContentTester = rankWith(2, uiTypeIs('RichContent'));

const PLACEHOLDER = 'Rich content';

/**
 * Rich content the author edits in place (doc 250 rules 7-12): its read-only view — a grey placeholder when it holds no
 * text — until one click (not a drag) opens a bare editor with the toolbar, focused. Every change is written; Escape or
 * focus leaving the element returns to the view. The toolbar is inside, so using it never closes the editor.
 */
export function StudioRichContentRenderer({ uischema, visible }: LayoutProps) {
  const editor = useStudioEditor();
  const element = useStudioElement();
  const [editing, setEditing] = useState(false);
  const pressedAt = useRef<Point | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const content = richContentOf(uischema);
  const editable = editor !== null && element !== null;
  const open = editing && editable;

  useLayoutEffect(() => {
    if (open) box.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus();
  }, [open]);

  if (!visible) return null;
  if (open) {
    const write = (state: RichTextState) =>
      editor.update(element.id, {
        options: { content: richTextHasText(state) ? state : undefined },
      });
    return (
      <div
        ref={box}
        data-slot="rich-content"
        data-editing=""
        className={`p-2 ${STUDIO_INTERACTIVE}`}
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
          value={content ?? null}
          placeholder={PLACEHOLDER}
          aria-label="Rich content"
          className="text-sm leading-relaxed"
          onChange={write}
        />
      </div>
    );
  }
  const empty = !richTextHasText(content);
  return (
    <div
      data-slot="rich-content"
      data-placeholder={empty ? '' : undefined}
      className={`p-2 ${editable ? `cursor-text ${STUDIO_INTERACTIVE}` : ''}`}
      onPointerDown={(event) => {
        pressedAt.current = { x: event.clientX, y: event.clientY };
      }}
      onClick={(event) => {
        if (editable && !dragged(pressedAt.current, event)) setEditing(true);
      }}
    >
      {empty ? (
        <p className="text-sm text-placeholder">{PLACEHOLDER}</p>
      ) : (
        <RichTextView value={content ?? null} />
      )}
    </div>
  );
}

export const studioRichContentEntry = {
  tester: studioRichContentTester,
  renderer: withJsonFormsLayoutProps(StudioRichContentRenderer),
};
