import type { UISchemaElement } from '@jsonforms/core';
import ELK from 'elkjs/lib/elk.bundled.js';
import { useEffect, useState } from 'react';
import { elkGraph, readElkLayout, type FlowLayout, type LayoutOptions } from './flow-elk';

// Running ELK for the Flow canvas (doc 198 rule 30). ELK is ASYNCHRONOUS, which is what pulls the layout out of the
// render path and into this hook — dagre before it was a plain function call.

/** One engine for the whole app: `new ELK()` compiles its own bundle, and it holds no per-graph state. */
const elk = new ELK();

/** Nothing laid out yet — the canvas draws no nodes rather than a pile of them at the origin. */
const EMPTY: FlowLayout = { positions: new Map(), routes: new Map() };

/**
 * Rule 30: the positions and edge routes ELK gives this document, recomputed when the document, the algorithm or the
 * direction changes.
 *
 * `cancelled` is the usual async-effect guard: a layout that resolves after its inputs changed is dropped, so a quick
 * succession of edits cannot paint an older arrangement over a newer one. A layout that REJECTS (an algorithm ELK
 * refuses a graph for, say) leaves the canvas empty rather than throwing through React.
 */
export function useFlowLayout(flow: UISchemaElement, options: LayoutOptions): FlowLayout {
  const [layout, setLayout] = useState<FlowLayout>(EMPTY);
  const { algorithm, direction } = options;

  useEffect(() => {
    let cancelled = false;
    void elk
      .layout(elkGraph(flow, { algorithm, direction }))
      .then((laidOut) => {
        if (!cancelled) setLayout(readElkLayout(laidOut));
      })
      .catch(() => {
        if (!cancelled) setLayout(EMPTY);
      });
    return () => {
      cancelled = true;
    };
  }, [flow, algorithm, direction]);

  return layout;
}
