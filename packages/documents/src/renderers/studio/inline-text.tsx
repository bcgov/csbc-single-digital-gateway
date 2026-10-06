import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type Ref,
} from 'react';
import { STUDIO_INTERACTIVE } from './studio-element';

/** What `InlineEditableText` hands its `render`: spread onto the element that shows the text. */
export interface InlineTextElementProps {
  ref?: Ref<HTMLElement>;
  'data-slot': string;
  'data-editing'?: '';
  'data-placeholder'?: '';
  contentEditable?: 'plaintext-only';
  suppressContentEditableWarning?: boolean;
  'aria-label'?: string;
  className?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  onBlur?: () => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  children?: string;
}

export interface InlineEditableTextProps {
  /** The stored text; empty shows `placeholder`, in the placeholder grey. */
  text: string;
  placeholder: string;
  /** Classes the element always carries. */
  className?: string;
  slot: string;
  /** Names the element while it is being edited. */
  editLabel: string;
  /** Whether a click edits; otherwise the element is plain text. */
  editable: boolean;
  /** Enter commits unless Shift is held, which types a new line (doc 273 rule 6). */
  multiline?: boolean;
  /** The trimmed text, called only when it changed — `''` when cleared. */
  onCommit: (next: string) => void;
  /** Draws the element — a Heading, a CardTitle — from the props given. */
  render: (props: InlineTextElementProps) => ReactElement;
}

/**
 * Text the author edits in place (doc 236 rules 23-25, 42b; doc 273 rule 6): a text cursor, and one click makes the
 * element itself editable plain text with the caret where it landed — unless the press became a gridstack drag; Enter
 * or blur commits, Escape cancels. Keyed by mode, so leaving editing remounts the element from props and React never
 * reconciles against text the browser rewrote.
 */
export function InlineEditableText({
  text,
  placeholder,
  className = '',
  slot,
  editLabel,
  editable,
  multiline = false,
  onCommit,
  render,
}: InlineEditableTextProps) {
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  const ref = useRef<HTMLElement>(null);
  /** Where the press that may start an edit went down, and where the click landed — for the caret. */
  const pressedAt = useRef<Point | null>(null);
  const clickedAt = useRef<Point | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!editing || element === null) return;
    // Seeded once per edit: the author's text is the DOM's until they leave.
    element.textContent = text;
    element.focus();
    placeCaret(element, clickedAt.current);
  }, [editing]);

  const stop = (commit: boolean) => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setEditing(false);
    const next = (ref.current?.textContent ?? '').trim();
    if (commit && next !== text) onCommit(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' && !(multiline && event.shiftKey)) {
      event.preventDefault();
      stop(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      stop(false);
    }
  };

  if (editing) {
    return (
      <Fragment key="editing">
        {render({
          ref,
          'data-slot': slot,
          'data-editing': '',
          contentEditable: 'plaintext-only',
          suppressContentEditableWarning: true,
          'aria-label': editLabel,
          className: `${className} ${STUDIO_INTERACTIVE} outline-none`.trim(),
          onKeyDown,
          onBlur: () => stop(true),
        })}
      </Fragment>
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
    <Fragment key="view">
      {render({
        'data-slot': slot,
        ...(empty && { 'data-placeholder': '' as const }),
        ...(classes.length > 0 && { className: classes.join(' ') }),
        onPointerDown: (event) => {
          pressedAt.current = { x: event.clientX, y: event.clientY };
        },
        onClick: (event) => {
          if (!editable || dragged(pressedAt.current, event)) return;
          clickedAt.current = { x: event.clientX, y: event.clientY };
          editingRef.current = true;
          setEditing(true);
        },
        children: empty ? placeholder : text,
      })}
    </Fragment>
  );
}

export interface Point {
  x: number;
  y: number;
}

/** A press that travelled further than this before its click was a drag, not a click. */
const DRAG_DISTANCE = 4;

export function dragged(from: Point | null, to: { clientX: number; clientY: number }): boolean {
  return from !== null && Math.hypot(to.clientX - from.x, to.clientY - from.y) > DRAG_DISTANCE;
}

/** The caret at the clicked character when the browser can resolve it, else at the end of the text. */
function placeCaret(element: HTMLElement, at: Point | null): void {
  const selection = window.getSelection();
  if (selection === null) return;
  const range = at === null ? null : caretRangeAt(at);
  if (range !== null && element.contains(range.startContainer)) {
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }
  selection.selectAllChildren(element);
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
