import type { Rect, Viewport } from '@xyflow/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasGraph, CanvasNode } from './canvas-graph';
import {
  backDuration,
  refitViewport,
  setViewportNow,
  zoomDuration,
  zoomToBounds,
  zoomToViewport,
  type Zoomable,
} from './canvas-zoom';
import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import { flowRect, focusRect, type FocusFrame } from './focus-view';
import { pageFields } from './form-focus';
import { formsOf } from './funnel-model';

/** The focus machinery behind DocumentCanvas (doc 233): the frame, and the camera's zooms in and out. */

/** Room around a focused page, as a fraction of the viewport. */
export const PAGE_PADDING = 0.05;
/** Room around the whole flow after Back — xyflow's own fitView default. */
const FLOW_PADDING = 0.1;

/** Whether a Form is mid-morph: growing into its page, or shrinking back (with Back's edge fade-in). */
export const moving = (frame: FocusFrame): boolean =>
  (frame.id !== null && !frame.settled) || frame.leaving !== null;

/**
 * The focus frame: settled straight away for a focus present when the canvas mounts (a top-level Form opens as its
 * page), otherwise once the morph has had its duration — when the faded nodes leave the canvas. Back unsettles at
 * once, so everything returns to fade back in, and names the Form `leaving` for that same duration.
 */
export function useFocusFrame(
  uischema: Uischema,
  schema: Record<string, unknown>,
  focusedId: string | null,
): FocusFrame {
  const [settledId, setSettledId] = useState(focusedId);
  const [shownId, setShownId] = useState(focusedId);
  const [leaving, setLeaving] = useState<string | null>(null);
  if (shownId !== focusedId) {
    setShownId(focusedId);
    setLeaving(focusedId === null ? shownId : null);
    if (focusedId === null) setSettledId(null);
  }
  useEffect(() => {
    if (focusedId === null || focusedId === settledId) return;
    const timer = setTimeout(() => setSettledId(focusedId), zoomDuration());
    return () => clearTimeout(timer);
  }, [focusedId, settledId]);
  useEffect(() => {
    if (leaving === null) return;
    // Long enough for the attached edges' delayed fade-in, so dropping it never cuts the fade short.
    const timer = setTimeout(() => setLeaving(null), backDuration());
    return () => clearTimeout(timer);
  }, [leaving]);
  const pageId = focusedId ?? leaving;
  const form = formsOf(uischema).find((f) => pageId !== null && idOf(f) === pageId);
  const fields = useMemo(
    () => (form === undefined ? [] : pageFields(form, schema)),
    [form, schema],
  );
  const keepsTrailing =
    focusedId !== null && uischema['type'] === 'Form' && idOf(uischema) === focusedId;
  return useMemo(
    () => ({
      id: focusedId,
      settled: focusedId !== null && focusedId === settledId,
      leaving,
      fields,
      keepsTrailing,
    }),
    [focusedId, settledId, leaving, fields, keepsTrailing],
  );
}

/**
 * Whenever a Form becomes focused — a double-click, or a root Form focused by default (e.g. the first Form added to
 * an empty document) — the camera zooms onto its `focusRect`: the page, plus a root page's trailing +. A focus present
 * when the canvas mounts is left to ReactFlow's own `fitView`, which runs once the nodes are measured and sees the
 * same page and + (nothing else is drawn by then).
 */
export function useZoomInOnFocus(
  focusedId: string | null,
  keepsTrailing: boolean,
  graph: CanvasGraph,
  instance: { readonly current: Zoomable | null },
) {
  const zoomedTo = useRef(focusedId);
  const latestGraph = useRef(graph);
  latestGraph.current = graph;
  useEffect(() => {
    if (focusedId === zoomedTo.current) return;
    zoomedTo.current = focusedId;
    const card = focusedCard(latestGraph.current, focusedId);
    if (card !== undefined)
      zoomToBounds(instance.current, focusRect(card, keepsTrailing), PAGE_PADDING);
  }, [focusedId, keepsTrailing, instance]);
}

/**
 * Back (doc 233 rule 5): as the page shrinks back into its card, the camera returns to the view the author
 * double-clicked from — or, for a Form that was focused from the start, fits the whole flow.
 */

export function useZoomOutOnBack(
  focusedId: string | null,
  nodes: CanvasNode[],
  instance: { readonly current: Zoomable | null },
  before: { current: Viewport | null },
) {
  const previous = useRef(focusedId);
  const latestNodes = useRef(nodes);
  latestNodes.current = nodes;
  useEffect(() => {
    const unfocused = previous.current;
    previous.current = focusedId;
    if (unfocused === null || focusedId !== null) return;
    const viewport = before.current;
    before.current = null;
    // Back to exactly where the author double-clicked from; a Form focused from the start has no such view, so the
    // camera fits the whole flow instead.
    if (viewport !== null) zoomToViewport(instance.current, viewport);
    else zoomToBounds(instance.current, flowRect(latestNodes.current, unfocused), FLOW_PADDING);
  }, [focusedId, instance, before]);
}

/** The focused Form's card as the graph lays it out — where its page grows from. */
export function focusedCard(graph: CanvasGraph, focusedId: string | null): CanvasNode | undefined {
  if (focusedId === null || graph.kind !== 'graph') return undefined;
  return graph.nodes.find((node) => node.id === focusedId && node.type === 'form');
}

/**
 * While a page is open, re-fits it to the canvas on every resize (doc 233 rule 15): xyflow keeps the viewport's
 * top-left and zoom fixed on a resize, so the page slid sideways and overflowed a narrower canvas. Now it shrinks and
 * grows with the canvas, centred, keeping the author's scroll position. Not while the page grows or shrinks — the
 * camera is moving then.
 */
export function useKeepPageFitted(
  canvas: { readonly current: HTMLElement | null },
  instance: { readonly current: Zoomable | null },
  bounds: Rect | undefined,
) {
  useEffect(() => {
    const element = canvas.current;
    if (element === null || bounds === undefined) return;
    let size = `${element.clientWidth}x${element.clientHeight}`;
    const observer = new ResizeObserver(() => {
      const next = `${element.clientWidth}x${element.clientHeight}`;
      if (next === size) return;
      size = next;
      const current = instance.current?.getViewport();
      if (current === undefined) return;
      const viewport = refitViewport(
        current,
        bounds,
        element.clientWidth,
        element.clientHeight,
        PAGE_PADDING,
      );
      setViewportNow(instance.current, viewport);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [canvas, instance, bounds]);
}
