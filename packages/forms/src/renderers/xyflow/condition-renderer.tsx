import type { LayoutProps, UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { mdiCallSplit } from '@mdi/js';
import { Icon } from '@mdi/react';
import { useContext } from 'react';
import type { Criterion } from '../../types/elements';
import { FlowContext } from './flow-context';
import { CONDITION_PLACEMENT_MESSAGE, criteriaOf } from './flow-elements';

// The Condition card (doc 199 rules 19, 21). The criteria are SUMMARISED here; the pickers that edit them and
// the + affordances that wire their outputs are added with the authoring gestures.

/** An element's `label` when a non-empty string, else `fallback`. */
function labelOf(element: UISchemaElement, fallback: string): string {
  const label = (element as { label?: unknown }).label;
  return typeof label === 'string' && label.trim() !== '' ? label.trim() : fallback;
}

/**
 * Rule 19: a criterion read back in words. The field is shown by its KEY here — resolving it to the authored
 * label needs the document's schema and the upstream walk, which the card is given with the editing pickers.
 */
export function criterionSummary(criterion: Criterion): string {
  const { field, operator, value } = criterion;
  return value === undefined ? `${field} ${operator}` : `${field} ${operator} ${String(value)}`;
}

/**
 * The Condition layout renderer (doc 199 rules 19, 21). Outside a Flow it renders a placement error, exactly as a
 * Stage does. Inside one — dispatched by its Condition node — a card: the label, then a row per criterion, then
 * the default row that every Condition ends with.
 */
function ConditionLayout({ uischema, visible }: LayoutProps) {
  const flow = useContext(FlowContext);
  if (!flow) {
    return (
      <p role="alert" data-slot="condition-placement-error" className="text-sm text-destructive">
        {CONDITION_PLACEMENT_MESSAGE}
      </p>
    );
  }
  if (!visible) return null;
  const criteria = criteriaOf(uischema);

  return (
    <div
      data-slot="condition-card"
      className="w-64 rounded-xl border bg-card text-card-foreground shadow-sm"
    >
      <div
        data-slot="condition-label"
        className="flex items-center gap-1.5 border-b px-3 py-2 text-sm font-semibold"
      >
        <Icon path={mdiCallSplit} size="16px" className="shrink-0 text-muted-foreground" />
        <span className="truncate">{labelOf(uischema, 'Condition')}</span>
      </div>
      <ul className="flex flex-col gap-1.5 p-2">
        {criteria.map((criterion) => (
          <li
            key={criterion.id}
            data-slot="condition-criterion-row"
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <span className="truncate">{criterionSummary(criterion)}</span>
          </li>
        ))}
        {/* Every Condition ends with the default: what an answer matching no criterion follows (rule 13). */}
        <li
          data-slot="condition-default-row"
          className="rounded-md border border-dashed px-2 py-1.5 text-sm text-muted-foreground"
        >
          Otherwise
        </li>
      </ul>
    </div>
  );
}

export const ConditionLayoutRenderer = withJsonFormsLayoutProps(ConditionLayout);
