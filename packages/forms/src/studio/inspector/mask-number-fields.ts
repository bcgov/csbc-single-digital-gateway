import type { JsonSchema } from '@jsonforms/core';
import { currentComponent } from './control-components';
import { BOOLEAN, integer, STRING } from './field-schemas';
import type { InspectorContext } from './inspector-context';
import type { InspectorEdit } from './inspector-edits';
import {
  finite,
  optionsOf,
  orCleared,
  setElement,
  setProperty,
  text,
  withOption,
} from './inspector-edits';
import type { InspectorField } from './inspector-fields';

// Doc 204 rules 9, 22-24 — the Text field's mask and the Number field's decimals and style. Their own module
// because inspector-fields.ts is at the 300-line gate, the same reason LAYOUT_FIELDS and DOCUMENT_FIELDS left it.

/** Doc 188 rule 22: an inspector boolean is the compact switch, never a checkbox. */
const SWITCH = { component: 'switch', size: 'sm' } as const;

/** Rule 14: fraction digits, as a whole number the author types rather than a list to scroll. */
const DECIMALS: JsonSchema = integer({ minimum: 0, maximum: 10 });

/** Rule 16: the three display styles, plain first — it is what an unstyled number already does. */
const STYLE: JsonSchema = {
  type: 'string',
  oneOf: [
    { const: 'plain', title: 'Plain' },
    { const: 'currency', title: 'Currency' },
    { const: 'percentage', title: 'Percentage' },
  ],
};

/** Rule 16: what a Currency field shows when the author has named no other currency. */
export const DEFAULT_CURRENCY = 'CAD';

const isText = (ctx: InspectorContext) => ctx.controlKind === 'text';
const isNumber = (ctx: InspectorContext) => ctx.controlKind === 'number';

/** Rule 8: a mask belongs to the field rendered as an INPUT — a Textarea is never masked. */
const isMaskable = (ctx: InspectorContext) => isText(ctx) && currentComponent(ctx) === 'input';

/**
 * Doc 204 rule 9c: the mask-dependent visibility rules, evaluated by JSONForms against the inspector form's OWN
 * data — not by `applies`, which would change the form's shape mid-typing and remount the field being typed
 * into. `WHEN_MASKED` matches a non-empty Mask; a form with no Mask field at all (a Textarea) resolves it to
 * `undefined`, which matches nothing, so Max length simply stays visible there.
 */
const WHEN_MASKED = {
  scope: '#/properties/mask',
  schema: { type: 'string', minLength: 1 },
} as const;

export const HIDE_WHEN_MASKED = Object.freeze({ effect: 'HIDE', condition: WHEN_MASKED });
const SHOW_WHEN_MASKED = Object.freeze({ effect: 'SHOW', condition: WHEN_MASKED });

/** Rule 14: Decimal places is shown only while Allow decimals is on — again a rule, not an `applies`. */
const SHOW_WHEN_DECIMALS = Object.freeze({
  effect: 'SHOW',
  condition: { scope: '#/properties/allowDecimals', schema: { const: true } },
});

/**
 * Rule 9b: whether the bound property still carries a `maxLength` to clear. Read from the ACCUMULATING edit,
 * not from `ctx`, so a write chain that has already changed the schema sees its own result.
 */
function hasMaxLength(ctx: InspectorContext, edit: InspectorEdit): boolean {
  const key = ctx.propertyKey;
  if (key === undefined) return false;
  return edit.schema.properties?.[key]?.maxLength !== undefined;
}

/** Rule 13: decimals are allowed unless the property says `integer`. */
const allowsDecimals = (ctx: InspectorContext) => ctx.property?.type !== 'integer';

/** The authored `options.format`, or `{}` — the object Style merges into (rule 16). */
const formatOf = (ctx: InspectorContext): Record<string, unknown> => {
  const format = optionsOf(ctx.element)['format'];
  return typeof format === 'object' && format !== null && !Array.isArray(format)
    ? (format as Record<string, unknown>)
    : {};
};

/**
 * Rule 16: Style is a VIEW of `options.format.style`, so it merges rather than replaces — a richer format
 * hand-authored in the code panel keeps every key it has. Plain removes the style (and the currency that only
 * a currency style needs), and an emptied format object is removed entirely rather than left as `{}`.
 */
function writeStyle(format: Record<string, unknown>, style: unknown) {
  const { style: _style, currency: _currency, ...rest } = format;
  if (style === 'currency')
    return { ...rest, style: 'currency', currency: text(_currency) ?? DEFAULT_CURRENCY };
  if (style === 'percentage') return { ...rest, style: 'percent' };
  return rest;
}

/** Rules 6, 9: the Mask and Store unmasked settings, rendered right where Max length was. */
export const MASK_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'mask',
    section: 'validation',
    label: 'Mask',
    applies: isMaskable,
    schema: () => ({
      ...STRING,
      description: 'A pattern typed input is formatted into: 9 a digit, a a letter, * either.',
    }),
    options: () => ({ placeholder: '(999) 999-9999' }),
    read: (ctx) => text(optionsOf(ctx.element)['mask']),
    /**
     * Rule 9: writing a mask also CLEARS `schema.maxLength`. A mask is itself a length rule, and the two
     * contradict silently — a `maxLength: 10` with a 14-character mask fails every submission with nothing on
     * screen to explain it. Hiding the field alone (see `inspector-fields.ts`) would leave the keyword behind,
     * still enforced by Ajv and no longer visible. A deliberate cross-field write, unlike every other setting.
     *
     * Rule 9b: it clears the keyword ONLY when one is actually there. `withKey(bag, key, undefined)` rebuilds
     * the bag whether or not the key exists, so clearing unconditionally handed back a NEW `document.schema`
     * object on every keystroke — and a new schema identity re-inits the canvas's `<JsonForms>` and its
     * gridstack, which steals focus from the inspector mid-typing. No other field rewrites the schema unless
     * its own value changed. Reported from the browser; jsdom keeps focus either way, because its gridstack is
     * stubbed (doc 180).
     */
    write: (ctx, edit, value) => {
      const masked = setElement(edit, withOption(edit.element, 'mask', orCleared(value)));
      return orCleared(value) !== undefined && hasMaxLength(ctx, edit)
        ? setProperty(ctx, masked, 'maxLength', undefined)
        : masked;
    },
  },
  {
    key: 'maskUnmasked',
    section: 'validation',
    label: 'Store unmasked value',
    // Always part of a maskable field's form, SHOWN only once there is a mask (rule 9c) — on its own the
    // setting would promise to strip characters nothing adds.
    applies: isMaskable,
    rule: () => SHOW_WHEN_MASKED,
    schema: () => ({
      ...BOOLEAN,
      description: 'Store the characters typed, without the pattern around them.',
    }),
    options: () => SWITCH,
    read: (ctx) => optionsOf(ctx.element)['maskUnmasked'] === true,
    // Written only when ON: `false` is the same as absent (rule 6), and the document stays minimal.
    write: (_ctx, edit, value) =>
      setElement(edit, withOption(edit.element, 'maskUnmasked', value === true ? true : undefined)),
  },
] satisfies InspectorField[]);

/** Rules 13-14: Allow decimals and Decimal places, rendered after the number bounds. */
export const NUMBER_VALUE_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'allowDecimals',
    section: 'validation',
    label: 'Allow decimals',
    applies: isNumber,
    schema: () => ({ ...BOOLEAN, description: 'Off restricts the field to whole numbers.' }),
    options: () => SWITCH,
    read: allowsDecimals,
    /**
     * Rule 13: the property TYPE carries this — `integer` is what Ajv rejects `1.5` on, client and server alike,
     * and doc 204 rules 17-18 make that type render and classify as the same number field.
     *
     * Rule 14b: turning decimals OFF also clears `options.decimals`, for the same reason a mask clears
     * `maxLength` (rule 9). Decimal places is hidden on a whole-number field, so a leftover `decimals: 2` would
     * be a rule the author can no longer see — and an actively contradictory one: the renderer would draw
     * `1,234.50` on a field Ajv rejects any fraction for, and the citizen API's submit check would allow two
     * decimal places the schema forbids. Found by hand-verifying in the browser, not by a test.
     */
    write: (ctx, edit, value) => {
      const typed = setProperty(ctx, edit, 'type', value === false ? 'integer' : 'number');
      return value === false
        ? setElement(typed, withOption(typed.element, 'decimals', undefined))
        : typed;
    },
  },
  {
    key: 'decimals',
    section: 'validation',
    label: 'Decimal places',
    // Meaningless on a whole-number field, so it follows Allow decimals — by a rule, not by leaving the form
    // (rule 9c), so toggling the switch never restructures the panel.
    applies: isNumber,
    rule: () => SHOW_WHEN_DECIMALS,
    schema: () => DECIMALS,
    read: (ctx) => finite(optionsOf(ctx.element)['decimals']),
    write: (_ctx, edit, value) =>
      setElement(edit, withOption(edit.element, 'decimals', orCleared(value))),
  },
] satisfies InspectorField[]);

/** Rule 16: Style, in Appearance — it changes how the number READS, not what it accepts. */
export const NUMBER_STYLE_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'numberStyle',
    section: 'appearance',
    label: 'Style',
    applies: isNumber,
    schema: () => STYLE,
    read: (ctx) => {
      const style = formatOf(ctx)['style'];
      if (style === 'currency') return 'currency';
      return style === 'percent' ? 'percentage' : 'plain';
    },
    write: (ctx, edit, value) => {
      const next = writeStyle(formatOf(ctx), value);
      return setElement(
        edit,
        withOption(edit.element, 'format', Object.keys(next).length > 0 ? next : undefined),
      );
    },
  },
] satisfies InspectorField[]);
