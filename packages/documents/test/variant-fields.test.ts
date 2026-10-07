import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { variantFieldItems, variantPalette } from '../src/studio/variants/variant-fields';

const content = (): DocumentContent => ({
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name' },
      agree: { type: 'boolean', title: 'I agree' },
      colour: { type: 'string', oneOf: [{ const: 'r', title: 'Red' }] },
      unused: { type: 'string', title: 'Unused' },
    },
  },
  variants: {
    default: {
      id: 'f',
      type: 'Form',
      elements: [
        {
          id: 'g',
          type: 'Grid',
          elements: [
            {
              id: 'c-colour',
              type: 'Control',
              scope: '#/properties/colour',
              options: { component: 'radio-group', gridItem: { x: 0, y: 0 }, description: 'Pick' },
              rule: { effect: 'HIDE', condition: { scope: '#/properties/agree', schema: {} } },
            },
          ],
        },
        { id: 'c-name', type: 'Control', scope: '#/properties/name', label: 'Your name' },
        {
          id: 'c-agree',
          type: 'Control',
          scope: '#/properties/agree',
          options: { component: 'switch' },
        },
      ],
    },
    Mobile: {
      id: 'm',
      type: 'Form',
      elements: [{ id: 'm-name', type: 'Control', scope: '#/properties/name' }],
    },
  },
});

describe('variantFieldItems (doc 262 rule 13a)', () => {
  it("lists one Fields item per property default binds and the variant does not, in default's reading order", () => {
    const items = variantFieldItems(content(), 'Mobile');
    expect(items.map((item) => item.id)).toEqual(['field:colour', 'field:agree']);
    expect(items.every((item) => item.group === 'Basic fields')).toBe(true);
    // An empty variant is offered every field default shows — never one default does not.
    expect(variantFieldItems(content(), 'Blank').map((item) => item.id)).toEqual([
      'field:colour',
      'field:name',
      'field:agree',
    ]);
  });

  it('labels an item by the property title, else its key', () => {
    const items = variantFieldItems(content(), 'Mobile');
    expect(items.map((item) => item.label)).toEqual(['colour', 'I agree']);
    const switchItem = DEFAULT_PALETTE_ITEMS.find((item) => item.id === 'switch')!;
    const radio = DEFAULT_PALETTE_ITEMS.find((item) => item.id === 'radio-group')!;
    expect(items.map((item) => item.icon)).toEqual([radio.icon, switchItem.icon]);
  });

  it('creates a Control over the same scope with a fresh id and no properties', () => {
    const [colour] = variantFieldItems(content(), 'Mobile');
    const first = colour!.create();
    const second = colour!.create();
    expect(first.properties).toBeUndefined();
    expect(first.element).toMatchObject({ type: 'Control', scope: '#/properties/colour' });
    expect(first.element['id']).not.toBe(second.element['id']);
    expect(first.element['id']).not.toBe('c-colour');
  });

  it("copies default's options minus gridItem and description, with no rule or label", () => {
    const [colour, agree] = variantFieldItems(content(), 'Mobile');
    const element = colour!.create().element;
    expect(element['options']).toEqual({ component: 'radio-group' });
    expect(element).not.toHaveProperty('rule');
    expect(element).not.toHaveProperty('label');
    expect(agree!.create().element['options']).toEqual({ component: 'switch' });
    const name = variantFieldItems(content(), 'Blank').find((i) => i.id === 'field:name')!;
    const nameElement: Uischema = name.create().element;
    expect(nameElement).not.toHaveProperty('options');
    expect(nameElement).not.toHaveProperty('label');
  });

  it('withholds resolver items whose creation adds schema properties outside default', () => {
    const outside = variantPalette(DEFAULT_PALETTE_ITEMS, content(), 'Mobile');
    expect(outside.map((item) => item.id)).toEqual([
      'vertical-layout',
      'horizontal-layout',
      'grid',
      'tabs',
      'card',
      'section',
      'heading',
      'separator',
      'rich-content',
      'table',
      'accordion-group',
      'field:colour',
      'field:agree',
    ]);
    const inDefault = variantPalette(DEFAULT_PALETTE_ITEMS, content(), 'default');
    expect(inDefault.map((item) => item.id)).toEqual(DEFAULT_PALETTE_ITEMS.map((item) => item.id));
  });
});
