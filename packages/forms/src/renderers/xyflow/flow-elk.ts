import type { UISchemaElement } from '@jsonforms/core';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api';
import type { StagePosition } from '../../types/elements';
import { drawnNodes, elementsOf, rowsOf } from './flow-elements';
import { flowEdges } from './flow-graph';

// The Flow canvas's layout, as ELK sees it (doc 198 rules 30-33). PURE — no React, no @xyflow/react, and no call to
// ELK itself: this module only builds the graph ELK is given and reads back what it returns, so both halves are
// testable without the engine.

/** The horizontal room a node is given: the `w-72` card plus the studio frame around it (measured in the browser). */
export const NODE_WIDTH = 306;
/**
 * A node's height. ELK needs a size per node and the cards are not measured at this point — these match what the
 * browser reports: a Stage with one Form is 147px and a Condition with one row 219px.
 */
const STAGE_BASE = 120;
const STAGE_FORM_ROW = 30;
const CONDITION_BASE = 150;
const CONDITION_CRITERION_ROW = 70;

/** Rule 30: a node's height, from what it holds. A taller card would otherwise overlap the one after it. */
export function heightOf(element: UISchemaElement, kind: string): number {
  return kind === 'condition'
    ? CONDITION_BASE + rowsOf(element).length * CONDITION_CRITERION_ROW
    : STAGE_BASE + elementsOf(element).length * STAGE_FORM_ROW;
}

/** Doc 198 rule 32: which way the flow runs. */
export type LayoutDirection = 'vertical' | 'horizontal';

/**
 * Rule 32b: HORIZONTAL by default (user decision 2026-09-17) — a form is read left to right, an edge arriving on a
 * card's left and leaving on its right, and a branching flow has more room to spread sideways than down.
 */
export const DEFAULT_DIRECTION: LayoutDirection = 'horizontal';

/**
 * Doc 198 rule 31, SUPERSEDED 2026-09-17 (user: "get rid of the xyflow panel for layout type, direction. Layered
 * and horizontal works"). The canvas offered five ELK algorithms and both directions through an on-canvas picker;
 * `layered` + horizontal is the one that draws a branching form well, and the other four were a way of finding
 * that out, not a setting an author has any reason to change. The picker and the algorithm vocabulary are gone.
 *
 * `LayoutDirection` STAYS parameterised even though only `horizontal` is now produced: it is threaded through
 * `FlowContext` into the handle faces (`flow-handles.ts`) and everything that hangs off a card, all of which read
 * it rather than assuming an axis — which is exactly what made this switch a one-line change rather than a rewrite.
 * Fixing the axis into those would undo that for no gain.
 */
const ALGORITHM = 'layered';

export interface LayoutOptions {
  readonly direction: LayoutDirection;
}

/** The gap ELK leaves between two nodes, and between one layer and the next (doc 198 rule 24's room for corners). */
const NODE_SPACING = 80;
const LAYER_SPACING = 160;
/**
 * Doc 198 rule 34: how far an edge keeps from a node it passes, and from another edge beside it. ELK's defaults are
 * 10px, which ran a passing edge along the side of a card — close enough to make the card's own + hard to hit.
 */
const EDGE_NODE_SPACING = 40;
const EDGE_EDGE_SPACING = 24;

/**
 * Rule 30: the graph ELK is asked to lay out — every drawn node with its size, and every sanitised edge.
 *
 * `elk.direction` is what turns the flow: `DOWN` stacks the layers top to bottom, `RIGHT` runs them across. The
 * spacing options are named per-algorithm in ELK, so both the layered ones and the generic ones are set — the
 * generic ones are kept now that only `layered` runs, because ELK reads both names for some of them.
 */
export function elkGraph(flow: UISchemaElement, { direction }: LayoutOptions): ElkNode {
  const nodes = drawnNodes(flow);
  return {
    id: 'flow',
    layoutOptions: {
      'elk.algorithm': ALGORITHM,
      'elk.direction': direction === 'vertical' ? 'DOWN' : 'RIGHT',
      'elk.spacing.nodeNode': String(NODE_SPACING),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(LAYER_SPACING),
      // Rule 34: the same clearance within a layer and between layers, so a lane never grazes a card.
      'elk.spacing.edgeNode': String(EDGE_NODE_SPACING),
      'elk.layered.spacing.edgeNodeBetweenLayers': String(EDGE_NODE_SPACING),
      'elk.spacing.edgeEdge': String(EDGE_EDGE_SPACING),
      'elk.layered.spacing.edgeEdgeBetweenLayers': String(EDGE_EDGE_SPACING),
      // Rule 33: ELK routes an edge around the nodes between its ends when asked for orthogonal segments.
      'elk.edgeRouting': 'ORTHOGONAL',
    },
    children: nodes.map(({ id, element, kind }) => ({
      id,
      width: NODE_WIDTH,
      height: heightOf(element, kind),
    })),
    edges: flowEdges(flow).map(({ id, source, target }) => ({
      id,
      sources: [source],
      targets: [target],
    })),
  };
}

/** A point on the path ELK routed an edge along, in canvas coordinates. */
export interface RoutePoint {
  readonly x: number;
  readonly y: number;
}

export interface FlowLayout {
  readonly positions: Map<string, StagePosition>;
  /** Rule 33: the bend points of each edge's route, by edge id — empty for an edge ELK drew straight. */
  readonly routes: Map<string, RoutePoint[]>;
}

/**
 * Rule 33: what ELK returned, as the canvas needs it — a position per node and the bends of each edge's route.
 *
 * ELK positions a node by its top-left corner, which is what xyflow wants, so nothing is shifted. An edge's route is
 * its section's BEND POINTS alone: the section's start and end are the handles, which the edge component already has,
 * and ELK places them on the node's border rather than on the handle the card actually draws.
 */
export function readElkLayout(laidOut: ElkNode): FlowLayout {
  const positions = new Map<string, StagePosition>(
    (laidOut.children ?? []).map((child) => [child.id, { x: child.x ?? 0, y: child.y ?? 0 }]),
  );
  const routes = new Map<string, RoutePoint[]>(
    (laidOut.edges ?? []).map((edge) => [
      edge.id,
      ((edge as ElkExtendedEdge).sections ?? []).flatMap((section) =>
        (section.bendPoints ?? []).map(({ x, y }) => ({ x, y })),
      ),
    ]),
  );
  return { positions, routes };
}
