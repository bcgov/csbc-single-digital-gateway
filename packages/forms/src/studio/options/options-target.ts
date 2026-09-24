import type { JsonSchema } from '@jsonforms/core';
import {
  choiceOptions,
  type ChoiceOption,
  type ChoiceType,
} from '../../renderers/ui/choice-control';
import { itemsChoiceType, multiChoiceOptions } from '../../renderers/ui/multi-choice-control';
import { currentComponent } from '../inspector/control-components';
import { inspectorContext } from '../inspector/inspector-context';
import type { ElementIds } from '../layout/element-ids';
import type { EditableDocument } from '../layout/schema-properties';

// Doc 206 rules 1, 16 — what the Options section and the dialog need to know about the selected field.
// Pure. Resolving it is also the test for whether the section appears at all (rule 1).

/** The field being edited. */
export interface OptionsTarget {
  readonly elementId: string;
  /** The bound property key — what a Flow clause's `field` holds (rule 21). */
  readonly propertyKey: string;
  /** The field's label, for the dialog subline. */
  readonly label: string;
  /** What the author picked from the palette: Combobox, Radio group, Multi-select, Checkbox group. */
  readonly fieldName: string;
  readonly options: ChoiceOption[];
  /** Rule 16: resolved ONCE, and fixed for the life of the dialog. */
  readonly type: ChoiceType;
}

/**
 * Rule 3: the palette's vocabulary, not `control-components.ts`'s. That map is keyed BY KIND, so a
 * multi-choice combobox is titled "Combobox" there (doc 205 rule 33) — correct for a setting that sits under
 * a known field, wrong for a subline whose whole job is to say WHICH field this is.
 */
const FIELD_NAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  choice: { combobox: 'Combobox', 'radio-group': 'Radio group' },
  'multi-choice': { combobox: 'Multi-select', 'checkbox-group': 'Checkbox group' },
};

/**
 * Rule 1: the target for `elementId`, or `undefined` when it is not a field whose options `renderers/ui`
 * reads. It asks `choiceOptions` / `multiChoiceOptions` — the SAME functions dispatch uses — so the section
 * can never appear on a field that does not render its options, nor be missing from one that does.
 */
export function optionsTargetOf(
  document: EditableDocument,
  elementId: string,
  ids: ElementIds,
): OptionsTarget | undefined {
  const ctx = inspectorContext(document, elementId, ids);
  const kind = ctx?.controlKind;
  if (!ctx || ctx.propertyKey === undefined || ctx.property === undefined) return undefined;
  if (kind !== 'choice' && kind !== 'multi-choice') return undefined;

  const property: JsonSchema = ctx.property;
  const single = kind === 'choice';
  const options = single ? choiceOptions(property) : multiChoiceOptions(property);
  // Rule 16: `property.type` for a single choice; for a multi-choice the DECLARED `items.type`, else the type
  // inferred from the first const (doc 205 rule 1).
  const type = single
    ? (property.type as ChoiceType | undefined)
    : itemsChoiceType((property.items ?? {}) as Record<string, unknown>);
  if (options === undefined || type === undefined) return undefined;

  return {
    elementId,
    propertyKey: ctx.propertyKey,
    label: typeof property.title === 'string' ? property.title : ctx.propertyKey,
    fieldName: FIELD_NAMES[kind]?.[currentComponent(ctx) ?? ''] ?? 'Choice',
    options,
    type,
  };
}
