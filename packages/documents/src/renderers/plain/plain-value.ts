import { choiceOptions, multiChoiceOptions } from '../ui/choice-options';
import { currencyOf, isMoneyControl } from '../ui/currency';
import { numberOptions } from '../ui/number-options';
import {
  isRichTextProperty,
  richTextHasText,
  richTextValue,
  type RichTextState,
} from '../ui/rich-text-value';

// Doc 282 rule 7: what a plain field shows — the same words the field showed. Pure and React-free (as @repo/forms'
// `control-plain-value.ts`, restated: this package imports no forms renderers). Every reader returns `undefined` for
// "not answered"; only the field writes that wording.

export type PlainValue =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'rich'; state: RichTextState };

/** A Control's answer as plain text, by the kind its schema makes it; `undefined` when not answered. */
export function plainValue(
  schema: unknown,
  uischema: unknown,
  data: unknown,
): PlainValue | undefined {
  if (data === undefined || data === null || data === '') return undefined;
  if (isRichTextProperty(schema)) return plainRich(data);
  const single = choiceOptions(schema);
  if (single !== undefined) {
    const chosen = single.find((option) => option.value === data);
    return text(chosen === undefined ? raw(data) : chosen.label);
  }
  const multiple = multiChoiceOptions(schema);
  if (multiple !== undefined) return plainList(multiple, data);
  const type = recordOf(schema)?.['type'];
  if (typeof data === 'boolean' && type === 'boolean') return text(data ? 'Yes' : 'No');
  if (typeof data === 'number' && (type === 'number' || type === 'integer'))
    return text(new Intl.NumberFormat(undefined, numberFormat(uischema, schema)).format(data));
  return text(raw(data));
}

/**
 * The field's own format; Money adds its currency's narrow symbol (doc 286 rule 7) — `$1,234.50`, not `CA$1,234.50`.
 * `currencyOf` only ever yields a registry code, so `Intl` never sees an authored one.
 */
function numberFormat(uischema: unknown, schema: unknown): Intl.NumberFormatOptions | undefined {
  const { format } = numberOptions(uischema, schema);
  if (!isMoneyControl(uischema)) return format;
  return {
    ...format,
    style: 'currency',
    currency: currencyOf(uischema).code,
    currencyDisplay: 'narrowSymbol',
  };
}

/** Rule 7: the chosen labels in AUTHORING order, then values the schema no longer lists, raw; none → unanswered. */
function plainList(
  options: readonly { value: string | number; label: string }[],
  data: unknown,
): PlainValue | undefined {
  if (!Array.isArray(data)) return text(raw(data));
  const known = options.filter((option) => data.includes(option.value)).map((o) => o.label);
  const unknown = data
    .filter((value) => !options.some((option) => option.value === value))
    .map(raw);
  const items = [...known, ...unknown];
  return items.length === 0 ? undefined : { kind: 'list', items };
}

/** Rule 7: a seedable state holding text; anything else unanswered — or, if not a state at all, raw. */
function plainRich(data: unknown): PlainValue | undefined {
  const state = richTextValue(data);
  if (state === undefined) return text(raw(data));
  return richTextHasText(state) ? { kind: 'rich', state } : undefined;
}

/** Stored data is never dropped (doc 211 rule 10, restated): a string as is, an object as JSON. */
function raw(value: unknown): string {
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
}

function text(value: string): PlainValue | undefined {
  return value === '' ? undefined : { kind: 'text', text: value };
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
