import { Heading, type HeadingLevel } from '@repo/ui/heading';
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { STUDIO_INTERACTIVE } from './studio-element';

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
 * A heading the author edits in place (doc 236 rules 23-25, 42b), shared by the studio Heading and Form title: a text
 * cursor, and one click makes the heading itself editable plain text with the caret where it landed — unless the press
 * became a gridstack drag; Enter or blur commits, Escape cancels. Keyed by mode, so leaving editing remounts the heading
 * from props and React never reconciles against text the browser rewrote.
 */
export function InlineEditableHeading({
  text,
  placeholder,
  level,
  size,
  className = '',
  slot,
  editLabel,
  editable,
  onCommit,
}: InlineEditableHeadingProps) {
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  const ref = useRef<HTMLHeadingElement>(null);
  /** Where the press that may start an edit went down, and where the click landed — for the caret. */
  const pressedAt = useRef<Point | null>(null);
  const clickedAt = useRef<Point | null>(null);

  useLayoutEffect(() => {
    const heading = ref.current;
    if (!editing || heading === null) return;
    // Seeded once per edit: the author's text is the DOM's until they leave.
    heading.textContent = text;
    heading.focus();
    placeCaret(heading, clickedAt.current);
  }, [editing]);

  const stop = (commit: boolean) => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setEditing(false);
    const next = (ref.current?.textContent ?? '').trim();
    if (commit && next !== text) onCommit(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLHeadingElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      stop(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      stop(false);
    }
  };

  const sizeProp = size !== undefined && { size };
  if (editing) {
    return (
      <Heading
        key="editing"
        ref={ref}
        data-slot={slot}
        data-editing=""
        level={level}
        {...sizeProp}
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        aria-label={editLabel}
        className={`${className} ${STUDIO_INTERACTIVE} outline-none`.trim()}
        onKeyDown={onKeyDown}
        onBlur={() => stop(true)}
      />
    );
  }
  const empty = text.trim() === '';
  // Interactive on its own (rule 20): the root Form's title has no StudioElement wrapper to turn pointer events back on
  // inside the page's `pointer-events-none`, so without this a click falls through to the canvas node.
  const classes = [
    className,
    editable && `cursor-text ${STUDIO_INTERACTIVE}`,
    // BCDS placeholder grey: `text-muted-foreground` (secondary text) is barely lighter than a heading.
    empty && 'text-placeholder',
  ].filter(Boolean);
  return (
    <Heading
      key="view"
      data-slot={slot}
      data-placeholder={empty ? '' : undefined}
      level={level}
      {...sizeProp}
      {...(classes.length > 0 && { className: classes.join(' ') })}
      onPointerDown={(event) => {
        pressedAt.current = { x: event.clientX, y: event.clientY };
      }}
      onClick={(event) => {
        if (!editable || dragged(pressedAt.current, event)) return;
        clickedAt.current = { x: event.clientX, y: event.clientY };
        editingRef.current = true;
        setEditing(true);
      }}
    >
      {empty ? placeholder : text}
    </Heading>
  );
}

interface Point {
  x: number;
  y: number;
}

/** A press that travelled further than this before its click was a drag, not a click. */
const DRAG_DISTANCE = 4;

function dragged(from: Point | null, to: { clientX: number; clientY: number }): boolean {
  return from !== null && Math.hypot(to.clientX - from.x, to.clientY - from.y) > DRAG_DISTANCE;
}

/** The caret at the clicked character when the browser can resolve it, else at the end of the text. */
function placeCaret(heading: HTMLElement, at: Point | null): void {
  const selection = window.getSelection();
  if (selection === null) return;
  const range = at === null ? null : caretRangeAt(at);
  if (range !== null && heading.contains(range.startContainer)) {
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }
  selection.selectAllChildren(heading);
  selection.collapseToEnd();
}

function caretRangeAt({ x, y }: Point): Range | null {
  if (typeof document.caretPositionFromPoint === 'function') {
    const position = document.caretPositionFromPoint(x, y);
    if (position === null) return null;
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    return range;
  }
  // Older WebKit has only the non-standard API.
  const legacy = (document as { caretRangeFromPoint?: (x: number, y: number) => Range | null })
    .caretRangeFromPoint;
  return typeof legacy === 'function' ? legacy.call(document, x, y) : null;
}
