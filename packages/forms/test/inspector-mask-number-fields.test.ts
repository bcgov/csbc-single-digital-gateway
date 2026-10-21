import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { validateUischemaDocument } from '../src/studio/code/validate-document';
import { createElementIds } from '../src/studio/layout/element-ids';
import { docOf, el, fieldControl, formFor, sections } from './inspector-fixtures';

// Doc 204 rules 9, 22-25 — the five new inspector settings: which apply, in what order, what they write, and
// the option keys the code panel must describe.

const schema: JsonSchema = {
  type: 'object',
  properties: {
    phone: { type: 'string', title: 'Phone' },
    price: { type: 'number', title: 'Price' },
    count: { type: 'integer', title: 'Count' },
    agree: { type: 'boolean', title: 'Agree' },
    plan: { type: 'string', title: 'Plan', oneOf: [{ const: 'a', title: 'A' }] },
  },
};

const control = (key: string, options?: object) =>
  el({ type: 'Control', scope: `#/properties/${key}`, ...(options ? { options } : {}) });

/** The field keys of `element`'s inspector form, flattened across its sections. */
const keysOf = (element: UISchemaElement) =>
  sections(formFor(element, docOf(element), schema).form).flatMap(([, keys]) => keys);

/**
 * Applies inspector `changes` on top of the element's CURRENT inspector data.
 *
 * TRAP (cost a debug cycle): `applyInspector` walks every applicable field, so a key missing from the values
 * object reads as "the author cleared it" — passing `{ maskUnmasked: true }` alone silently deleted the mask.
 * The panel always hands back the whole form's data, so the test must too.
 */
function applyTo(element: UISchemaElement, changes: Record<string, unknown>) {
  const uischema = docOf(element);
  const ids = createElementIds();
  const current = formFor(element, uischema, schema).form.data;
  return applyInspector({ schema, uischema }, ids.idOf(element), { ...current, ...changes }, ids);
}

/** The JSONForms `rule` on a field's control, or undefined. */
const ruleOf = (element: UISchemaElement, key: string) =>
  (fieldControl(formOf(element), key) as { rule?: unknown } | undefined)?.rule;

/**
 * The inspector form for `element` INSIDE its own document — one instance, never two.
 * TRAP (doc 203): `formFor` resolves the element by IDENTITY, so `formFor(control(), docOf(control()))` builds
 * two different objects and finds neither.
 */
function formOf(element: UISchemaElement) {
  return formFor(element, docOf(element), schema).form;
}

/** The single element of an applied document, and its options. */
const appliedElement = (result: { uischema: UISchemaElement }) =>
  (result.uischema as UISchemaElement & { elements: UISchemaElement[] }).elements[0] as
    | (UISchemaElement & { options?: Record<string, unknown> })
    | undefined;

const appliedProperty = (result: { schema: JsonSchema }, key: string) =>
  result.schema.properties?.[key];

describe('which settings apply (rules 8, 22)', () => {
  it('offers Mask on a text control rendered as an input', () => {
    expect(keysOf(control('phone'))).toContain('mask');
  });

  it('offers no Mask on a textarea component (rule 8)', () => {
    expect(keysOf(control('phone', { component: 'textarea' }))).not.toContain('mask');
  });

  it('offers no Mask on a number, choice or boolean control', () => {
    for (const key of ['price', 'plan', 'agree']) {
      expect(keysOf(control(key)), key).not.toContain('mask');
    }
  });

  it('shows Store unmasked value only once a mask is set — by a rule, not by leaving the form', () => {
    // Rule 9c: it is always in the form; a SHOW rule flips `visible`. Dropping it would restructure the
    // panel mid-typing and remount the Mask field.
    expect(keysOf(control('phone'))).toContain('maskUnmasked');
    expect(ruleOf(control('phone'), 'maskUnmasked')).toEqual({
      effect: 'SHOW',
      condition: { scope: '#/properties/mask', schema: { type: 'string', minLength: 1 } },
    });
  });

  it('offers Allow decimals and Style on a number control, and on an integer one', () => {
    for (const key of ['price', 'count']) {
      expect(keysOf(control(key)), key).toEqual(
        expect.arrayContaining(['allowDecimals', 'numberStyle']),
      );
    }
    expect(keysOf(control('phone'))).not.toContain('allowDecimals');
  });

  it('shows Decimal places only while decimals are allowed — again by a rule (rule 9c)', () => {
    expect(keysOf(control('price'))).toContain('decimals');
    expect(keysOf(control('count'))).toContain('decimals');
    expect(ruleOf(control('price'), 'decimals')).toEqual({
      effect: 'SHOW',
      condition: { scope: '#/properties/allowDecimals', schema: { const: true } },
    });
    // The data drives it: an integer property reads allowDecimals false, so the rule hides the field.
    expect(formOf(control('count')).data['allowDecimals']).toBe(false);
  });
});

describe('rendered order and presentation (rules 23-24)', () => {
  it('renders Max length, then Mask, then Store unmasked value', () => {
    const keys = keysOf(control('phone', { mask: '999' }));
    expect(keys.indexOf('maxLength')).toBeLessThan(keys.indexOf('mask'));
    expect(keys.indexOf('mask')).toBeLessThan(keys.indexOf('maskUnmasked'));
  });

  it('renders Allow decimals before Decimal places, after the bounds', () => {
    const keys = keysOf(control('price'));
    expect(keys.indexOf('minimum')).toBeLessThan(keys.indexOf('allowDecimals'));
    expect(keys.indexOf('allowDecimals')).toBeLessThan(keys.indexOf('decimals'));
  });

  it('asks for the compact switch for both boolean settings', () => {
    expect(
      fieldControl(formOf(control('phone', { mask: '999' })), 'maskUnmasked')?.options,
    ).toEqual({ component: 'switch', size: 'sm' });
    expect(fieldControl(formOf(control('price')), 'allowDecimals')?.options).toEqual({
      component: 'switch',
      size: 'sm',
    });
  });

  it('gets horizontal orientation on Decimal places from its number field schema', () => {
    expect(fieldControl(formOf(control('price')), 'decimals')?.options?.['orientation']).toBe(
      'horizontal',
    );
  });
});

describe('a mask replaces Max length (rules 9, 9c)', () => {
  it('hides Max length by a rule while a mask is set, keeping it in the form', () => {
    expect(keysOf(control('phone', { mask: '999' }))).toContain('maxLength');
    expect(ruleOf(control('phone'), 'maxLength')).toEqual({
      effect: 'HIDE',
      condition: { scope: '#/properties/mask', schema: { type: 'string', minLength: 1 } },
    });
  });

  it("KEEPS THE FORM'S SHAPE IDENTICAL as a mask is typed (rule 9c)", () => {
    // The bug this guards: dropping Max length and adding Store unmasked on the first keystroke rebuilt the
    // section's children, JSONForms re-dispatched them, and the Mask input being typed into was remounted —
    // the author lost focus after one character. Reported from the browser; the shape is the thing to pin.
    const before = sections(formOf(control('phone')));
    const after = sections(formOf(control('phone', { mask: '(' })));
    expect(after).toEqual(before);
  });

  it('clears schema.maxLength when a mask is written', () => {
    // Hiding alone would leave a keyword Ajv still enforces that the author can no longer see.
    const withLength: JsonSchema = {
      ...schema,
      properties: { ...schema.properties, phone: { type: 'string', maxLength: 10 } },
    };
    const element = control('phone');
    const uischema = docOf(element);
    const ids = createElementIds();
    const result = applyInspector(
      { schema: withLength, uischema },
      ids.idOf(element),
      { mask: '(999) 999-9999' },
      ids,
    );
    expect(result.schema.properties?.['phone']).toStrictEqual({ type: 'string' });
    expect(appliedElement(result)?.options).toStrictEqual({ mask: '(999) 999-9999' });
  });

  it('leaves the schema object ALONE when there is no maxLength to clear (rule 9b)', () => {
    // `withKey(bag, key, undefined)` rebuilds the bag whether or not the key is there, so clearing
    // unconditionally handed back a new `document.schema` on EVERY keystroke — which re-inits the canvas's
    // JsonForms and its gridstack, stealing focus from the field being typed into.
    const element = control('phone');
    const uischema = docOf(element);
    const ids = createElementIds();
    const document = { schema, uischema };
    const current = formFor(element, uischema, schema).form.data;
    const result = applyInspector(document, ids.idOf(element), { ...current, mask: '(9' }, ids);
    expect(result.schema).toBe(schema);
  });

  it('still rewrites the schema once, on the keystroke that actually clears a maxLength', () => {
    const withLength: JsonSchema = {
      ...schema,
      properties: { ...schema.properties, phone: { type: 'string', maxLength: 10 } },
    };
    const element = control('phone');
    const uischema = docOf(element);
    const ids = createElementIds();
    const current = formFor(element, uischema, withLength).form.data;
    const result = applyInspector(
      { schema: withLength, uischema },
      ids.idOf(element),
      { ...current, mask: '(9' },
      ids,
    );
    expect(result.schema).not.toBe(withLength);
    expect(result.schema.properties?.['phone']).toStrictEqual({ type: 'string' });
  });

  it('does not restore maxLength when the mask is cleared', () => {
    const result = applyTo(control('phone', { mask: '999' }), { mask: undefined });
    expect(appliedElement(result)?.options ?? {}).toStrictEqual({});
    expect(appliedProperty(result, 'phone')).not.toHaveProperty('maxLength');
  });
});

describe('write-back (rules 6, 13-16)', () => {
  it('removes options.mask entirely when the pattern is cleared', () => {
    const result = applyTo(control('phone', { mask: '999' }), { mask: '' });
    expect(appliedElement(result)?.options ?? {}).toStrictEqual({});
  });

  it('writes options.maskUnmasked only when true, and removes it when turned off', () => {
    const on = applyTo(control('phone', { mask: '999' }), { maskUnmasked: true });
    expect(appliedElement(on)?.options).toStrictEqual({ mask: '999', maskUnmasked: true });

    const off = applyTo(control('phone', { mask: '999', maskUnmasked: true }), {
      maskUnmasked: false,
    });
    expect(appliedElement(off)?.options).toStrictEqual({ mask: '999' });
  });

  it('clears a stale options.decimals when decimals are turned off (rule 14b)', () => {
    // Decimal places is hidden on a whole-number field, so a leftover `decimals` would be a rule the author
    // can no longer see — and the renderer would draw 1,234.50 on a field Ajv rejects any fraction for.
    const result = applyTo(control('price', { decimals: 2 }), { allowDecimals: false });
    expect(appliedProperty(result, 'price')).toStrictEqual({ type: 'integer', title: 'Price' });
    expect(appliedElement(result)?.options ?? {}).toStrictEqual({});
  });

  it('keeps the decimals when they are turned back on', () => {
    const result = applyTo(control('count', { decimals: 3 }), { allowDecimals: true });
    expect(appliedProperty(result, 'count')).toStrictEqual({ type: 'number', title: 'Count' });
    expect(appliedElement(result)?.options).toStrictEqual({ decimals: 3 });
  });

  it('writes the property type from Allow decimals (rule 13)', () => {
    const off = applyTo(control('price'), { allowDecimals: false });
    expect(appliedProperty(off, 'price')).toStrictEqual({ type: 'integer', title: 'Price' });

    const on = applyTo(control('count'), { allowDecimals: true });
    expect(appliedProperty(on, 'count')).toStrictEqual({ type: 'number', title: 'Count' });
  });

  it('writes options.decimals and removes it when cleared', () => {
    const set = applyTo(control('price'), { decimals: 2 });
    expect(appliedElement(set)?.options).toStrictEqual({ decimals: 2 });

    const cleared = applyTo(control('price', { decimals: 2 }), { decimals: undefined });
    expect(appliedElement(cleared)?.options ?? {}).toStrictEqual({});
  });

  it('merges Style into an authored options.format without dropping its other keys', () => {
    const rich = control('price', { format: { useGrouping: false, maximumFractionDigits: 4 } });
    const result = applyTo(rich, { numberStyle: 'currency' });
    expect(appliedElement(result)?.options).toStrictEqual({
      format: { useGrouping: false, maximumFractionDigits: 4, style: 'currency', currency: 'CAD' },
    });
  });

  it('keeps an authored currency rather than forcing CAD', () => {
    const result = applyTo(control('price', { format: { style: 'percent', currency: 'USD' } }), {
      numberStyle: 'currency',
    });
    expect(appliedElement(result)?.options).toStrictEqual({
      format: { style: 'currency', currency: 'USD' },
    });
  });

  it('removes the format entirely when the style goes back to plain', () => {
    const result = applyTo(control('price', { format: { style: 'currency', currency: 'CAD' } }), {
      numberStyle: 'plain',
    });
    expect(appliedElement(result)?.options ?? {}).toStrictEqual({});
  });

  it('reads percent back as percentage, and anything else as plain', () => {
    expect(formOf(control('price', { format: { style: 'percent' } })).data['numberStyle']).toBe(
      'percentage',
    );
    expect(formOf(control('price')).data['numberStyle']).toBe('plain');
  });

  it('returns the SAME document object when nothing changed (doc 187)', () => {
    const element = control('phone', { mask: '999' });
    const uischema = docOf(element);
    const ids = createElementIds();
    const document = { schema, uischema };
    const unchanged = formFor(element, uischema, schema).form.data;
    expect(applyInspector(document, ids.idOf(element), unchanged, ids)).toBe(document);
  });
});

describe('the metaschema describes the new options (rule 25)', () => {
  it('describes mask, maskUnmasked and decimals, so Monaco can complete and explain them', () => {
    // The Control branch is an `if`/`then` inside an allOf, so read the descriptions the editor shows.
    const text = JSON.stringify(UISCHEMA_METASCHEMA);
    expect(text).toContain('Format a text field as it is typed');
    expect(text).toContain('Store the characters typed rather than the masked text');
    expect(text).toContain('How many digits follow the decimal point');
  });

  it('accepts a document using all three at the apply gate', () => {
    const document = {
      type: 'Form',
      label: 'Titled',
      elements: [
        control('phone', { mask: '(999) 999-9999', maskUnmasked: true }),
        control('price', { decimals: 2, format: { style: 'currency', currency: 'CAD' } }),
      ],
    };
    expect(validateUischemaDocument(document).valid).toBe(true);
  });

  it('refuses an empty mask and an out-of-range decimals', () => {
    const withOptions = (options: object) => ({
      type: 'Form',
      label: 'Titled',
      elements: [control('phone', options)],
    });
    expect(validateUischemaDocument(withOptions({ mask: '' })).valid).toBe(false);
    expect(validateUischemaDocument(withOptions({ decimals: 11 })).valid).toBe(false);
    expect(validateUischemaDocument(withOptions({ decimals: 1.5 })).valid).toBe(false);
  });
});
