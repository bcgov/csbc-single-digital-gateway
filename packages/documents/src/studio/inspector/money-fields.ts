import {
  CURRENCIES,
  currencyOf,
  DEFAULT_CURRENCY,
  MONEY_MINIMUM,
} from '../../renderers/ui/currency';
import type { DocumentContent } from '../document-types';
import { refOf, type InspectorTarget, type TargetKind } from './inspector-target';
import { absentIf, choice, inDefault, isKind, type InspectorField } from './inspector-field';
import { cascadeCurrency } from './option-cascade';
import { updateProperty } from './schema-edits';

/**
 * Doc 286 rule 12: Money takes its currency's decimal places, which an `integer` property can't hold. In default
 * switching to Money rewrites the type; elsewhere the schema can't change, so Money is not offered — unless the field
 * already IS Money (a hand-authored document), whose current choice must stay listed.
 */
export function moneyWithheld(t: InspectorTarget, kind: TargetKind): boolean {
  return (
    kind === 'money' &&
    t.kind !== 'money' &&
    !inDefault(t) &&
    t.property?.schema['type'] === 'integer'
  );
}

/**
 * The schema half of switching Display as to Money in default (doc 286 rules 8a, 12): `integer` becomes `number`,
 * and a property with no minimum gets `MONEY_MINIMUM` — an authored minimum, even a negative one, is kept.
 */
export function moneyType(
  content: DocumentContent,
  t: InspectorTarget,
  kind: unknown,
): DocumentContent {
  if (kind !== 'money' || !inDefault(t) || t.property === undefined) return content;
  const { schema } = t.property;
  const patch = {
    ...(schema['type'] === 'integer' && { type: 'number' }),
    ...(schema['minimum'] === undefined && { minimum: MONEY_MINIMUM }),
  };
  return Object.keys(patch).length === 0
    ? content
    : updateProperty(content, refOf(t.property), patch);
}

/**
 * Doc 286 rules 10-11: the Currency select. Always valued (no Clear); DEFAULT-ONLY — it rides doc 262's schema lock
 * because the currency says what the stored number MEANS — and written to every Control on the property in every
 * variant, absent for the default currency.
 */
export const currencyField: InspectorField = {
  key: 'currency',
  section: 'Appearance',
  label: 'Currency',
  applies: isKind('money'),
  schema: () => choice(Object.values(CURRENCIES).map(({ code, label }) => [code, label] as const)),
  required: true,
  read: (t) => currencyOf(t.element).code,
  write: (content, t, value) =>
    t.property === undefined
      ? content
      : cascadeCurrency(
          content,
          refOf(t.property),
          absentIf(value, DEFAULT_CURRENCY) as string | undefined,
        ),
  schemaLevel: true,
};
