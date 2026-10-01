import type { ConditionRow } from '@repo/forms';
import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import {
  conditionsOf,
  edgesOf,
  elementsOf,
  withFunnel,
  type FunnelCondition,
} from './funnel-model';
import { edgeFrom, newForm } from './node-edits';

/**
 * The condition dialog's Save: replaces a Condition's label and rows. A row with no edge yet gets a NEW Form and a
 * branch edge to it — every branch leads somewhere — and a removed row's edge is dropped (its Form stays on the
 * canvas, unconnected). The default path is untouched.
 */
export function updateCondition(
  uischema: Uischema,
  conditionId: string,
  { label, rows }: { label: string; rows: ConditionRow[] },
): Uischema {
  const conditions = conditionsOf(uischema);
  const current = conditions.find((c) => c.id === conditionId);
  if (current === undefined) return uischema;

  const rowIds = new Set(rows.map((r) => r.id));
  const edges = edgesOf(uischema).filter(
    (e) => e.source !== conditionId || e.sourceHandle === undefined || rowIds.has(e.sourceHandle),
  );
  const unconnected = rows.filter(
    (row) => !edges.some((e) => e.source === conditionId && e.sourceHandle === row.id),
  );
  const forms = unconnected.map(() => newForm());

  return withFunnel(uischema, {
    elements: [...elementsOf(uischema), ...forms],
    conditions: conditions.map((c) => (c.id === conditionId ? edited(c, label, rows) : c)),
    edges: [
      ...edges,
      ...unconnected.map((row, i) =>
        edgeFrom({ source: conditionId, sourceHandle: row.id }, idOf(forms[i]!)!),
      ),
    ],
  });
}

/** `condition` with new rows and a trimmed label — no `label` key at all when it is blank. */
function edited(condition: FunnelCondition, label: string, rows: ConditionRow[]): FunnelCondition {
  const { label: _previous, ...rest } = condition;
  const trimmed = label.trim();
  return {
    ...rest,
    ...(trimmed !== '' && { label: trimmed }),
    options: { ...condition.options, rows },
  };
}
