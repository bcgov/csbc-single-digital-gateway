import { describe, expect, it } from 'vitest';
import { copyElement } from '../src/studio/element-copy';
import { findById } from '../src/studio/element-ids';
import { removeElement } from '../src/studio/element-remove';
import { insertItem } from '../src/studio/palette-insert';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { mayDropIn } from '../src/studio/record-drop';
import { intoRecord, recordArrayOf } from '../src/studio/record-scope';
import { ITEM, itemProps, items, props, recordContent } from './record-fixture';

const item = (id: string) => DEFAULT_PALETTE_ITEMS.find((candidate) => candidate.id === id)!;
const layoutOf = (c: ReturnType<typeof recordContent>) =>
  findById(c.variants['default']!, 'L')!['elements'] as Record<string, unknown>[];

describe('record edits (doc 271 rules 10-13, 15)', () => {
  it('finds the record holding an element, nearest first, and none on the page', () => {
    const root = recordContent().variants['default']!;
    expect(recordArrayOf(root, 'L')).toBe('people');
    expect(recordArrayOf(root, 'f')).toBe('people');
    expect(recordArrayOf(root, 'r')).toBeUndefined();
    expect(recordArrayOf(root, 'n')).toBeUndefined();
    expect(recordArrayOf(root, 'missing')).toBeUndefined();
  });

  it('rescopes a created field into the record and refuses nesting and page fields', () => {
    const text = intoRecord(item('text').create(), 'people')!;
    const [key] = Object.keys(text.properties!);
    expect(text.element['scope']).toBe(`${ITEM}/${key}`);
    expect(intoRecord(item('heading').create(), 'people')).toBeDefined();
    expect(intoRecord(item('data-table').create(), 'people')).toBeUndefined();
    expect(intoRecord(item('record').create(), 'people')).toBeUndefined();
    const pageField = { element: { id: 'x', type: 'Control', scope: '#/properties/name' } };
    expect(intoRecord(pageField, 'people')).toBeUndefined();
  });

  it('inserts a palette field into the record as an item property', () => {
    const c = recordContent();
    const next = insertItem(c, 'L', 1, item('text').create());
    const added = Object.keys(itemProps(next)).filter((k) => k !== 'first');
    expect(added).toHaveLength(1);
    expect(Object.keys(props(next))).toEqual(['name', 'people']);
    expect(layoutOf(next)[1]!['scope']).toBe(`${ITEM}/${added[0]}`);
    // Doc 277: required among the ITEM's fields, not the page's.
    expect(items(next)['required']).toContain(added[0]);
    expect(next.schema['required'] ?? []).not.toContain(added[0]);
    // Nesting is refused at write time too.
    expect(insertItem(c, 'L', 0, item('record').create())).toBe(c);
    // A page insert is unchanged.
    const page = insertItem(c, 'P', 0, item('text').create());
    expect(Object.keys(props(page))).toHaveLength(3);
  });

  it('prunes an item property, and its required entry, when its field is deleted', () => {
    const next = removeElement(recordContent(), 'f');
    expect(itemProps(next)).toEqual({});
    expect(items(next)).not.toHaveProperty('required');
    expect(props(next)).toHaveProperty('name');
    // Still shown in another variant: kept.
    const shared = recordContent({
      variants: {
        mobile: {
          id: 'M',
          type: 'Form',
          elements: [{ id: 'f2', type: 'Control', scope: `${ITEM}/first` }],
        },
      },
    });
    expect(itemProps(removeElement(shared, 'f'))).toHaveProperty('first');
    // Deleting the record removes the array and so its items.
    expect(props(removeElement(recordContent(), 'r'))).not.toHaveProperty('people');
  });

  it('copies an item field to a fresh item key, and a whole record to a fresh array', () => {
    const field = copyElement(recordContent(), 'f')!;
    const keys = Object.keys(itemProps(field.content));
    expect(keys).toHaveLength(2);
    expect(items(field.content)['required']).toEqual(['first', keys[1]]);
    expect(findById(field.content.variants['default']!, field.copyId)!['scope']).toBe(
      `${ITEM}/${keys[1]}`,
    );
    const whole = copyElement(recordContent(), 'r')!;
    const arrays = Object.keys(props(whole.content)).filter((k) => k !== 'name');
    expect(arrays).toHaveLength(2);
    const copy = findById(whole.content.variants['default']!, whole.copyId)!;
    const fresh = arrays[1]!;
    expect(copy['scope']).toBe(`#/properties/${fresh}`);
    const copiedField = (copy['elements'] as Record<string, unknown>[])[0]!['elements'] as Record<
      string,
      unknown
    >[];
    expect(copiedField[0]!['scope']).toBe(`#/properties/${fresh}/items/properties/first`);
  });

  it('answers drops before gridstack takes them', () => {
    const c = recordContent();
    expect(mayDropIn(c, DEFAULT_PALETTE_ITEMS, 'L', { palette: true, itemId: 'text' })).toBe(true);
    expect(mayDropIn(c, DEFAULT_PALETTE_ITEMS, 'L', { palette: true, itemId: 'record' })).toBe(
      false,
    );
    expect(mayDropIn(c, DEFAULT_PALETTE_ITEMS, 'L', { palette: true, itemId: 'data-table' })).toBe(
      false,
    );
    expect(mayDropIn(c, DEFAULT_PALETTE_ITEMS, 'P', { palette: true, itemId: 'record' })).toBe(
      true,
    );
    expect(mayDropIn(c, DEFAULT_PALETTE_ITEMS, 'L', { elementId: 'n' })).toBe(true);
    expect(mayDropIn(c, DEFAULT_PALETTE_ITEMS, 'L', { elementId: 'r' })).toBe(false);
  });
});

describe('a record placed in another variant (doc 271 rule 20)', () => {
  it("brings default's item form, under fresh ids, in Record fields", async () => {
    const { variantFieldItems } = await import('../src/studio/variants/variant-fields');
    const c = recordContent({ variants: { mobile: { id: 'M', type: 'Form', elements: [] } } });
    const record = variantFieldItems(c, 'mobile').find((i) => i.id === 'field:people')!;
    expect(record.group).toBe('Record fields');
    const { element } = record.create();
    expect(element).toMatchObject({ options: { component: 'record' } });
    const [form] = element['elements'] as Record<string, unknown>[];
    expect(form).toMatchObject({
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: `${ITEM}/first` }],
    });
    expect(form!['id']).not.toBe('L');
    const name = variantFieldItems(c, 'mobile').find((i) => i.id === 'field:name')!;
    expect(name.group).toBe('Basic fields');
    expect(name.create().element).not.toHaveProperty('elements');
  });
});
