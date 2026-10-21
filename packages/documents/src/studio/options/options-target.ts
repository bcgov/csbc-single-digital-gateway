import {
  choiceOptions,
  itemsChoiceType,
  multiChoiceOptions,
  type ChoiceOption,
  type ChoiceType,
} from '../../renderers/ui/choice-options';
import type { InspectorTarget } from '../inspector/inspector-target';
import type { PropertyRef } from '../property-ref';
import { KIND_NAMES, refOf } from '../inspector/inspector-target';

/** The field whose options are being edited (doc 255 rule 1). */
export interface OptionsTarget {
  readonly elementId: string;
  /** The bound property key — what a Condition clause's `field` holds (rule 11). */
  readonly propertyKey: string;
  /** Where the options are written — a record item field's property (doc 271 rule 16); absent: the root key. */
  readonly ref?: PropertyRef;
  /** The field's label, for the dialog's subline. */
  readonly label: string;
  /** What the author placed: Select, Radio group, Multi-select, Checkbox group. */
  readonly fieldName: string;
  /** Whether the options live under `items` (a multiple choice). */
  readonly multiple: boolean;
  readonly options: ChoiceOption[];
  /** Fixed for the life of the dialog (rule 1). */
  readonly type: ChoiceType;
}

const SINGLE = new Set(['select', 'radio-group']);
const MULTIPLE = new Set(['multi-select', 'checkbox-group']);

/**
 * Rule 1: the options target for an inspected element, or `undefined` when it is no choice field. It reads through the
 * renderers' own `choiceOptions` / `multiChoiceOptions`, so the editor can never appear on a field that does not render
 * its options, nor be missing from one that does.
 */
export function optionsTargetOf(target: InspectorTarget | null): OptionsTarget | undefined {
  const property = target?.property;
  if (target === null || property === undefined) return undefined;
  const multiple = MULTIPLE.has(target.kind);
  if (!multiple && !SINGLE.has(target.kind)) return undefined;
  const { schema } = property;
  const options = multiple ? multiChoiceOptions(schema) : choiceOptions(schema);
  const items = schema['items'];
  const type = multiple
    ? typeof items === 'object' && items !== null && !Array.isArray(items)
      ? itemsChoiceType(items as Record<string, unknown>)
      : undefined
    : (schema['type'] as ChoiceType);
  if (options === undefined || type === undefined) return undefined;
  return {
    elementId: target.id,
    propertyKey: property.key,
    ref: refOf(property),
    label: target.name ?? property.key,
    fieldName: KIND_NAMES[target.kind],
    multiple,
    options,
    type,
  };
}
