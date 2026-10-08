import { mdiCurrencyUsd } from '@mdi/js';
import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { cascadeCurrency } from '../src/studio/inspector/currency-cascade';
import { schemaLocked } from '../src/studio/inspector/inspector-field';
import { fieldsFor, inspectorForm } from '../src/studio/inspector/inspector-form';
import { inspectorTarget, KIND_NAMES } from '../src/studio/inspector/inspector-target';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';

const MONEY = { component: 'money' };
const ctl = (id: string, key: string, options?: Record<string, unknown>): Uischema => ({
  id,
  type: 'Control',
  scope: `#/properties/${key}`,
  ...(options !== undefined && { options }),
});

/** A default Form and a Mobile Form, each with a Control on `price` and one on `other`. */
function content(
  type: 'number' | 'integer' = 'number',
  options: { d?: Record<string, unknown>; m?: Record<string, unknown> } = { d: MONEY, m: MONEY },
): DocumentContent {
  return {
    schema: {
      type: 'object',
      properties: {
        price: { type, title: 'Price' },
        other: { type: 'number', title: 'Other' },
      },
    },
    variants: {
      default: {
        id: 'f',
        type: 'Form',
        elements: [ctl('d-price', 'price', options.d), ctl('d-other', 'other', MONEY)],
      },
      Mobile: {
        id: 'm',
        type: 'Form',
        elements: [ctl('m-price', 'price', options.m), ctl('m-other', 'other', MONEY)],
      },
    },
  };
}
const inputs = (id: string, form: string) => ({
  pageSelectedId: id,
  focusedId: form,
  formId: form,
});
const defaultTarget = (c: DocumentContent, id = 'd-price') => inspectorTarget(c, inputs(id, 'f'))!;
const mobileTarget = (c: DocumentContent) => inspectorTarget(c, inputs('m-price', 'm'), 'Mobile')!;
const optionsIn = (c: DocumentContent, variant: string, index: number) =>
  ((c.variants[variant]!['elements'] as Uischema[])[index]!['options'] ?? {}) as Record<
    string,
    unknown
  >;

const elementIn = (c: DocumentContent, variant: string, index: number) =>
  (c.variants[variant]!['elements'] as Uischema[])[index];

/** `[section, [field labels]]` in display order. */
function layoutOf(uischema: Record<string, unknown>) {
  return (uischema['elements'] as Array<{ label: string; elements: Array<{ label: string }> }>).map(
    (group) => [group.label, group.elements.map((c) => c.label)],
  );
}
const displayChoices = (c: DocumentContent, target = defaultTarget(c)) => {
  const field = fieldsFor(target).find((f) => f.key === 'component')!;
  return (field.schema(target)['oneOf'] as Array<{ const: string }>).map((o) => o.const);
};

describe('Money authoring (doc 286 rules 8-15)', () => {
  describe('palette (rule 8)', () => {
    it('offers a Money item after Number creating a number property with component "money" and no currency', () => {
      const ids = DEFAULT_PALETTE_ITEMS.map((item) => item.id);
      expect(ids.indexOf('money')).toBe(ids.indexOf('number') + 1);
      const item = DEFAULT_PALETTE_ITEMS.find((i) => i.id === 'money')!;
      expect(item).toMatchObject({ label: 'Money', group: 'Basic fields', icon: mdiCurrencyUsd });
      expect(item.keywords).toEqual(['money', 'currency', 'amount', 'price', 'cost', 'dollar']);
      const { element, properties } = item.create();
      expect(element['options']).toEqual({ component: 'money' });
      expect(Object.values(properties!)).toEqual([
        { type: 'number', title: 'Untitled money', minimum: 0 },
      ]);
    });
  });

  describe('target kind (rule 14)', () => {
    it('a plain number with component "money" is kind "money", named Money', () => {
      const c = content('number', { d: MONEY });
      expect(defaultTarget(c).kind).toBe('money');
      expect(KIND_NAMES.money).toBe('Money');
      expect(defaultTarget(content('number', {})).kind).toBe('number');
    });
  });

  describe('fields (rules 9, 10, 12, 15)', () => {
    it('Money gets Display as and Currency in Appearance, and no Whole numbers only', () => {
      const form = inspectorForm(defaultTarget(content()));
      expect(layoutOf(form.uischema)).toEqual([
        ['General', ['Label', 'Description', 'Required']],
        ['Validation', ['Minimum', 'Maximum', 'Step']],
        ['Appearance', ['Display as', 'Currency', 'Placeholder', 'Hide label']],
      ]);
    });

    it('Number gets Display as offering Number and Money', () => {
      const c = content('number', {});
      const form = inspectorForm(defaultTarget(c));
      expect(layoutOf(form.uischema)).toEqual([
        ['General', ['Label', 'Description', 'Required']],
        ['Validation', ['Whole numbers only', 'Minimum', 'Maximum', 'Step']],
        ['Appearance', ['Display as', 'Placeholder', 'Hide label']],
      ]);
      expect(displayChoices(c)).toEqual(['number', 'money']);
    });

    it('Currency reads CAD when options.currency is absent', () => {
      expect(inspectorForm(defaultTarget(content())).data).toMatchObject({
        component: 'money',
        currency: 'CAD',
      });
    });
  });

  describe('Display as (rule 12)', () => {
    it('switching an integer property to Money in default also writes type "number"', () => {
      const c = content('integer', {});
      const target = defaultTarget(c);
      const next = applyInspector(c, target, { ...inspectorForm(target).data, component: 'money' });
      expect(optionsIn(next, 'default', 0)).toEqual({ component: 'money' });
      expect(next.schema['properties']).toMatchObject({ price: { type: 'number', minimum: 0 } });
      expect(optionsIn(next, 'Mobile', 0)).toEqual({});
    });

    it('switching to Money in default adds minimum 0 only when the property has none (rule 8a)', () => {
      const c = content('number', {});
      const switched = (from: DocumentContent) => {
        const target = defaultTarget(from);
        return applyInspector(from, target, { ...inspectorForm(target).data, component: 'money' });
      };
      expect(switched(c).schema['properties']).toMatchObject({ price: { minimum: 0 } });
      const authored = {
        ...c,
        schema: {
          ...c.schema,
          properties: {
            ...(c.schema['properties'] as object),
            price: { type: 'number', minimum: -5 },
          },
        },
      };
      expect(switched(authored).schema['properties']).toMatchObject({ price: { minimum: -5 } });
      // Outside default the schema is never written.
      const mobile = mobileTarget(c);
      const next = applyInspector(c, mobile, { ...inspectorForm(mobile).data, component: 'money' });
      expect(next.schema).toBe(c.schema);
      expect(optionsIn(next, 'Mobile', 0)).toEqual(MONEY);
    });

    it('withholds Money outside default when the property is integer', () => {
      const c = content('integer', {});
      expect(displayChoices(c, mobileTarget(c))).toEqual(['number']);
      expect(displayChoices(content('number', {}), mobileTarget(content('number', {})))).toEqual([
        'number',
        'money',
      ]);
      // A hand-authored integer Money keeps its current choice listed.
      const authored = content('integer');
      expect(displayChoices(authored, mobileTarget(authored))).toEqual(['number', 'money']);
    });

    it('switching Money back to Number keeps options.currency (rule 13)', () => {
      const c = content('number', { d: { ...MONEY, currency: 'XYZ' } });
      const target = defaultTarget(c);
      const next = applyInspector(c, target, {
        ...inspectorForm(target).data,
        component: 'number',
      });
      expect(optionsIn(next, 'default', 0)).toEqual({ currency: 'XYZ' });
    });
  });

  describe('Currency (rules 10-11)', () => {
    it('is read-only outside default and applyInspector skips it', () => {
      const c = content();
      const target = mobileTarget(c);
      const currency = fieldsFor(target).find((f) => f.key === 'currency')!;
      expect(schemaLocked(currency, target)).toBe(true);
      expect(schemaLocked(currency, defaultTarget(c))).toBe(false);
      expect(currency.required).toBe(true);
      const form = inspectorForm(target);
      const appearance = (form.uischema['elements'] as Uischema[])[2]!['elements'] as Uischema[];
      const select = appearance.find((el) => el['scope'] === '#/properties/currency');
      expect(select?.['options']).toMatchObject({ readonly: true });
      expect(applyInspector(c, target, { ...form.data, currency: 'XYZ' })).toBe(c);
    });

    it('a default write sets options.currency on every Control bound to the property in every variant, in one content', () => {
      const c = content('number', { d: MONEY, m: {} });
      const target = defaultTarget(c);
      const field = fieldsFor(target).find((f) => f.key === 'currency')!;
      const next = field.write(c, target, 'USD');
      expect(optionsIn(next, 'default', 0)).toEqual({ component: 'money', currency: 'USD' });
      expect(optionsIn(next, 'Mobile', 0)).toEqual({ currency: 'USD' });
      expect(optionsIn(next, 'default', 1)).toEqual(MONEY);
      expect(optionsIn(next, 'Mobile', 1)).toEqual(MONEY);
      // Untouched Controls keep their identity.
      expect(elementIn(next, 'Mobile', 1)).toBe(elementIn(c, 'Mobile', 1));
      expect(next.schema).toBe(c.schema);
    });

    it('cascades to record item fields by full ref and leaves other properties alone', () => {
      const item = (id: string, key: string): Uischema => ({
        id,
        type: 'Control',
        scope: `#/properties/rows/items/properties/${key}`,
        options: MONEY,
      });
      const record = (id: string): Uischema => ({
        id,
        type: 'Control',
        scope: '#/properties/rows',
        options: { component: 'record' },
        elements: [
          {
            id: `${id}-v`,
            type: 'VerticalLayout',
            elements: [item(`${id}-a`, 'amt'), item(`${id}-b`, 'tip')],
          },
        ],
      });
      const c: DocumentContent = {
        schema: { type: 'object', properties: {} },
        variants: {
          default: { id: 'f', type: 'Form', elements: [record('d'), ctl('d-amt', 'amt', MONEY)] },
          Mobile: { id: 'm', type: 'Form', elements: [record('m')] },
        },
      };
      const next = cascadeCurrency(c, { array: 'rows', key: 'amt' }, 'USD');
      const itemsOf = (v: string) =>
        (
          ((next.variants[v]!['elements'] as Uischema[])[0]!['elements'] as Uischema[])[0]![
            'elements'
          ] as Uischema[]
        ).map((el) => el['options']);
      for (const v of ['default', 'Mobile'])
        expect(itemsOf(v)).toEqual([{ ...MONEY, currency: 'USD' }, MONEY]);
      expect(optionsIn(next, 'default', 1)).toEqual(MONEY);
    });

    it('writes the key absent for CAD', () => {
      const c = content('number', {
        d: { ...MONEY, currency: 'USD' },
        m: { ...MONEY, currency: 'USD' },
      });
      const target = defaultTarget(c);
      const field = fieldsFor(target).find((f) => f.key === 'currency')!;
      const next = field.write(c, target, 'CAD');
      expect(optionsIn(next, 'default', 0)).toEqual(MONEY);
      expect(optionsIn(next, 'Mobile', 0)).toEqual(MONEY);
      expect(cascadeCurrency(next, { key: 'price' }, undefined)).toBe(next);
    });
  });
});
