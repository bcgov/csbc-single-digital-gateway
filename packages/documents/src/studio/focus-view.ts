import type { Rect } from '@xyflow/react';
import { endIdOf, NODE_WIDTH, type AddEdge, type CanvasNode } from './canvas-graph';
import { FADE_IN, FADE_IN_AFTER, MOTION } from './canvas-zoom';

/** The focused Form's page (doc 233 rule 4). */
export const PAGE_WIDTH = 768;
export const PAGE_HEIGHT = 994;
/** A Form card's fixed height (`h-14` in form-node.tsx): fixed, so it can transition to the page's height. */
export const CARD_HEIGHT = 56;

/**
 * Where the canvas is in a focus change: `id` is the focused Form (or `null`); `settled` once the morph has finished,
 * when the faded-out nodes and edges are taken off the canvas entirely.
 */
export interface FocusFrame {
  id: string | null;
  settled: boolean;
  /**
   * The Form whose page is shrinking back into its card after Back, until that has had its duration; `null`
   * otherwise. While it is set, everything else is fading back in.
   */
  leaving: string | null;
  /** The focused (or leaving) Form's fields, for its page. */
  fields: readonly string[];
  /**
   * The focused Form is the variant's ROOT (doc 233 rule 9): its page keeps its trailing + below it, since there is
   * no flow to go Back to — the + is how the author leaves the page.
   */
  keepsTrailing: boolean;
}

/** How far below a root page its trailing + sits: short — the page is alone, there is nothing to make room for. */
const TRAILING_GAP = 32;

/** Node positions animate, so a Form growing into a page (and back) and relayouts glide instead of jumping. */
const MOVES = `transition-[transform,opacity] ${MOTION}`;
const FADED = `${MOVES} pointer-events-none opacity-0`;
const RETURNING = `${MOVES} ${FADE_IN}`;

/**
 * The canvas's nodes for a focus frame (rule 4): the focused Form becomes a page in place, CENTRED on its card's centre
 * — so, with the camera aimed at that same point, it reads as zooming into the card rather than panning to it — while
 * every other node fades out, then leaves the canvas once settled.
 */
export function focusNodes(nodes: CanvasNode[], frame: FocusFrame): CanvasNode[] {
  const card = nodes.find((node) => node.id === frame.id && node.type === 'form');
  return nodes.map((node): CanvasNode => {
    if (frame.id === null) return backNode(node, frame);
    if (card !== undefined && keepsTrailing(frame) && node.id === endIdOf(frame.id)) {
      // The root page's + sits just below the page — as tall as it has grown — where its trailing edge now ends.
      const page = pageRect(card);
      const height = Math.max(page.height, card.measured?.height ?? 0);
      const position = { x: node.position.x, y: page.y + height + TRAILING_GAP };
      return { ...node, className: MOVES, position };
    }
    if (node.id !== frame.id || node.type !== 'form') {
      return frame.settled ? { ...node, hidden: true } : { ...node, className: FADED };
    }
    const { x, y } = pageRect(node);
    return {
      ...node,
      className: MOVES,
      position: { x, y },
      data: { ...node.data, focused: true, open: frame.settled, fields: [...frame.fields] },
    };
  });
}

/**
 * Back (rule 5), the zoom-in reversed: the leaving Form keeps its page — fading it out over the card — as it shrinks
 * back into place, while every other node fades back in. Once that settles, nodes carry only their position motion:
 * dropping the fade then replays nothing.
 */
function backNode(node: CanvasNode, frame: FocusFrame): CanvasNode {
  if (frame.leaving === null) return { ...node, className: MOVES };
  if (node.id !== frame.leaving || node.type !== 'form') return { ...node, className: RETURNING };
  return {
    ...node,
    className: MOVES,
    data: { ...node.data, closing: true, fields: [...frame.fields] },
  };
}

/**
 * The canvas's edges for a focus frame. Edges ATTACHED to the Form that is growing or shrinking are never drawn while
 * it changes size — its handles ride the page's edges, so they would stretch across the canvas: on focus they leave at
 * once, and on Back they fade in only once the page is a card again. Every other edge fades with the other nodes:
 * out (then off the canvas once settled) on focus, in on Back.
 */
export function focusEdges(edges: AddEdge[], frame: FocusFrame): AddEdge[] {
  const page = frame.id ?? frame.leaving;
  if (page === null) return edges;
  return edges.map((edge): AddEdge => {
    const attached = edge.source === page || edge.target === page;
    if (frame.id !== null && keepsTrailing(frame) && edge.target === endIdOf(frame.id)) {
      return withFade(edge, FADE_IN, 'with-flow');
    }
    if (frame.id !== null) {
      if (attached || frame.settled) return { ...edge, hidden: true };
      return withFade(edge, FADED, 'fading');
    }
    return withFade(
      edge,
      attached ? FADE_IN_AFTER : FADE_IN,
      attached ? 'after-page' : 'with-flow',
    );
  });
}

/** `edge` with a fade class, and the same fade flagged on its data for the label and + drawn outside it. */
function withFade(
  edge: AddEdge,
  className: string,
  fade: 'fading' | 'with-flow' | 'after-page',
): AddEdge {
  if (edge.data === undefined) return { ...edge, className };
  const data =
    fade === 'fading' ? { ...edge.data, fading: true } : { ...edge.data, appearing: fade };
  return { ...edge, className, data };
}

/** The rectangle a focused Form's page fills: centred on its card's centre, from the card's laid-out position. */
export function pageRect(card: CanvasNode): Rect {
  return {
    x: card.position.x + NODE_WIDTH / 2 - PAGE_WIDTH / 2,
    y: card.position.y + CARD_HEIGHT / 2 - PAGE_HEIGHT / 2,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  };
}

/** Half the + button's 24px circle, which centres on the trailing edge's end. */
const PLUS_RADIUS = 12;

/**
 * What the camera fits for a focused Form: its page — and, for a root page, the trailing + below it too, so the way
 * out is always on screen.
 */
export function focusRect(card: CanvasNode, withTrailing: boolean): Rect {
  const page = pageRect(card);
  return withTrailing ? { ...page, height: page.height + TRAILING_GAP + PLUS_RADIUS } : page;
}

/** Scroll room around an open page, in flow units. */
const SCROLL_MARGIN = 64;

/**
 * How far a focused page scrolls (doc 233 rule 12): the page as tall as it has grown — plus a root page's + — and a
 * margin. Applied as xyflow's `translateExtent`, so wheel scrolling stops at the page's top and bottom; an extent
 * narrower than the view is centred by d3.
 */
export function scrollExtent(
  card: CanvasNode,
  measuredHeight: number | undefined,
  withTrailing: boolean,
): [[number, number], [number, number]] {
  const page = pageRect(card);
  const height = Math.max(page.height, measuredHeight ?? 0);
  const trailing = withTrailing ? TRAILING_GAP + PLUS_RADIUS * 2 : 0;
  return [
    [page.x - SCROLL_MARGIN, page.y - SCROLL_MARGIN],
    [page.x + page.width + SCROLL_MARGIN, page.y + height + trailing + SCROLL_MARGIN],
  ];
}

/**
 * The whole flow's bounds with every Form a CARD again — what Back zooms out to while the page is still shrinking, so
 * the zoom does not aim at the page's size. Unmeasured nodes (never shown) count as a card.
 */
export function flowRect(nodes: CanvasNode[], unfocused: string | null): Rect {
  const boxes = nodes.map((node) => {
    const card = node.type === 'form' || node.type === 'condition';
    const height = node.id === unfocused ? CARD_HEIGHT : (node.measured?.height ?? CARD_HEIGHT);
    return {
      x: node.position.x,
      y: node.position.y,
      w: card ? NODE_WIDTH : 1,
      h: card ? height : 1,
    };
  });
  if (boxes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.w));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Whether the root page's trailing edge and + are drawn: once the page has settled, never while it grows. */
function keepsTrailing(frame: FocusFrame): boolean {
  return frame.keepsTrailing && frame.settled;
}
