import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PALETTE_ITEMS,
  defaultPalette,
  uniqueItems,
  type PaletteItem,
} from '../src/studio/palette-items';
import { blankContent } from '../src/studio/document-types';

const byId = (id: string) => DEFAULT_PALETTE_ITEMS.find((item) => item.id === id)!;

describe('palette items (doc 238 rules 1-4)', () => {
  it('lists every placeable studio renderer, in order, grouped', () => {
    expect(DEFAULT_PALETTE_ITEMS.map((i) => [i.id, i.label, i.group])).toEqual([
      ['vertical-layout', 'Vertical layout', 'Layout'],
      ['heading', 'Heading', 'Content'],
      ['checkbox', 'Checkbox', 'Fields'],
      ['switch', 'Switch', 'Fields'],
      ['text', 'Text', 'Fields'],
      ['textarea', 'Text area', 'Fields'],
    ]);
    for (const item of DEFAULT_PALETTE_ITEMS) expect(item.icon).toMatch(/^M/);
  });

  it('returns the default items whatever the context', () => {
    const content = blankContent();
    expect(defaultPalette({ type: null, kind: null, content })).toBe(DEFAULT_PALETTE_ITEMS);
    expect(defaultPalette({ type: 'services.service', kind: 'template', content })).toBe(
      DEFAULT_PALETTE_ITEMS,
    );
  });

  it('creates an empty level-2 Heading and an empty VerticalLayout, each with a fresh id', () => {
    const a = byId('heading').create();
    const b = byId('heading').create();
    expect(a.element).toMatchObject({ type: 'Heading', options: { level: 2 } });
    expect(a.element['options']).not.toHaveProperty('text');
    expect(a.element['id']).toMatch(/^[\w-]{8}$/);
    expect(a.element['id']).not.toBe(b.element['id']);
    expect(a.properties).toBeUndefined();
    expect(byId('vertical-layout').create().element).toMatchObject({
      type: 'VerticalLayout',
      elements: [],
    });
  });

  it('creates a Checkbox Control over a new nanoid(8) boolean property', () => {
    const { element, properties } = byId('checkbox').create();
    const [key] = Object.keys(properties!);
    expect(key).toMatch(/^[\w-]{8}$/);
    expect(element).toMatchObject({ type: 'Control', scope: `#/properties/${key}` });
    expect(element['options']).toBeUndefined();
    expect(properties![key!]).toEqual({ type: 'boolean', title: 'Untitled checkbox' });
    expect(Object.keys(byId('checkbox').create().properties!)[0]).not.toBe(key);
  });

  it('creates a Switch Control with options.component switch', () => {
    const { element, properties } = byId('switch').create();
    const [key] = Object.keys(properties!);
    expect(element).toMatchObject({
      type: 'Control',
      scope: `#/properties/${key}`,
      options: { component: 'switch' },
    });
    expect(properties![key!]).toEqual({ type: 'boolean', title: 'Untitled switch' });
  });

  it('drops an item whose id repeats an earlier one', () => {
    const a: PaletteItem = { ...byId('heading'), label: 'First' };
    const b: PaletteItem = { ...byId('heading'), label: 'Second' };
    expect(uniqueItems([a, b, byId('switch')]).map((i) => i.label)).toEqual(['First', 'Switch']);
  });

  it('creates Text and Text area Controls over new nanoid(8) string properties (doc 239 rule 13)', () => {
    const text = byId('text').create();
    const [key] = Object.keys(text.properties!);
    expect(key).toMatch(/^[\w-]{8}$/);
    expect(text.element).toMatchObject({ type: 'Control', scope: `#/properties/${key}` });
    expect(text.element['options']).toBeUndefined();
    expect(text.properties![key!]).toEqual({ type: 'string', title: 'Untitled text' });
    const area = byId('textarea').create();
    const [areaKey] = Object.keys(area.properties!);
    expect(area.element).toMatchObject({ options: { component: 'textarea' } });
    expect(area.properties![areaKey!]).toEqual({ type: 'string', title: 'Untitled text area' });
  });
});
