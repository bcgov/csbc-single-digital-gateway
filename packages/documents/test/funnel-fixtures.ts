import type { ConditionRow } from '@repo/forms';
import type { Uischema } from '../src/studio/document-types';
import { idOf } from '../src/studio/element-ids';
import {
  conditionsOf,
  edgesOf,
  type FunnelCondition,
  type FunnelEdge,
} from '../src/studio/funnel-model';

/** Builders and readers shared by the funnel tests. */
export const NANOID_8 = /^[\w-]{8}$/;

export const form = (id: string, label = id, elements: unknown[] = []): Uischema => ({
  id,
  type: 'Form',
  label,
  elements,
});

export const control = (key: string, label?: string): Uischema => ({
  id: `c-${key}`,
  type: 'Control',
  scope: `#/properties/${key}`,
  ...(label !== undefined && { label }),
});

export const edge = (
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
): FunnelEdge => ({
  id,
  source,
  ...(sourceHandle !== undefined && { sourceHandle }),
  target,
});

export const row = (
  id: string,
  label = id,
  clauses: ConditionRow['clauses'] = [],
): ConditionRow => ({
  id,
  label,
  match: 'all',
  clauses,
});

export const condition = (id: string, rows: ConditionRow[], label?: string): FunnelCondition => ({
  id,
  type: 'Condition',
  ...(label !== undefined && { label }),
  options: { rows },
});

export const funnel = (
  elements: Uischema[],
  edges: FunnelEdge[],
  conditions: FunnelCondition[] = [],
): Uischema => ({ id: 'fun', type: 'Funnel', elements, options: { conditions, edges } });

/** The Funnel's Form ids in `elements` order. */
export const formIds = (u: Uischema): (string | undefined)[] =>
  (u['elements'] as Uischema[]).map((f) => idOf(f));

/** Edges as `source[handle]>target`, ids aside. */
export const links = (u: Uischema): string[] =>
  edgesOf(u).map(
    (e) => `${e.source}${e.sourceHandle === undefined ? '' : `[${e.sourceHandle}]`}>${e.target}`,
  );

export const onlyCondition = (u: Uischema): FunnelCondition => {
  const [only, ...rest] = conditionsOf(u);
  if (only === undefined || rest.length > 0) throw new Error('expected exactly one condition');
  return only;
};
