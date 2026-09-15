import type { JsonSchema } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  buildTemplate,
  nextTitle,
  PALETTE_GROUPS,
  PALETTE_TEMPLATES,
} from '../src/studio/palette/palette-templates';

// Doc 189 rules 16-17 — the palette catalogue, its default configurations and numbered titles.

const EMPTY: JsonSchema = { type: 'object', properties: {} };
const OPTIONS = [
  { const: 'option-1', title: 'Option 1' },
  { const: 'option-2', title: 'Option 2' },
];

describe('catalogue (rule 16)', () => {
  it('groups Display, Layout and Fields, then Flow (doc 196 rule 17), in that order', () => {
    expect(PALETTE_GROUPS.map((group) => [group.id, group.label])).toEqual([
      ['display', 'Display'],
      ['layout', 'Layout'],
      ['fields', 'Fields'],
      ['flow', 'Flow'],
    ]);
    expect(
      PALETTE_TEMPLATES.map((template) => [template.group, template.key, template.label]),
    ).toEqual([
      ['display', 'heading', 'Heading'],
      ['display', 'separator', 'Separator'],
      ['layout', 'grid', 'Grid'],
      ['layout', 'vertical-layout', 'Vertical layout'],
      ['layout', 'horizontal-layout', 'Horizontal layout'],
      ['fields', 'text', 'Text'],
      ['fields', 'textarea', 'Textarea'],
      ['fields', 'number', 'Number'],
      ['fields', 'combobox', 'Combobox'],
      ['fields', 'radio-group', 'Radio group'],
      ['fields', 'checkbox', 'Checkbox'],
      ['fields', 'switch', 'Switch'],
      ['flow', 'stage', 'Stage'],
      ['flow', 'form', 'Form'],
    ]);
  });

  it('gives every template an mdi icon path and at least one keyword', () => {
    for (const template of PALETTE_TEMPLATES) {
      expect(template.icon, template.key).toMatch(/^M/);
      expect(template.keywords.length, template.key).toBeGreaterThan(0);
    }
  });

  it('is frozen', () => {
    expect(Object.isFrozen(PALETTE_TEMPLATES)).toBe(true);
    expect(Object.isFrozen(PALETTE_GROUPS)).toBe(true);
  });
});

describe('building templates (rule 16)', () => {
  it.each([
    ['heading', { type: 'Heading', text: 'Heading', options: { level: 2 } }],
    ['separator', { type: 'Separator' }],
    ['grid', { type: 'Grid', elements: [] }],
    ['vertical-layout', { type: 'VerticalLayout', elements: [] }],
    ['horizontal-layout', { type: 'HorizontalLayout', options: { columns: 2 }, elements: [] }],
  ])('builds %s with no property', (key, element) => {
    expect(buildTemplate(key, EMPTY)).toEqual({ element });
  });

  it.each([
    ['text', {}, { type: 'string', title: 'Text 1' }],
    ['textarea', { options: { component: 'textarea' } }, { type: 'string', title: 'Textarea 1' }],
    ['number', {}, { type: 'number', title: 'Number 1' }],
    ['combobox', {}, { type: 'string', title: 'Combobox 1', oneOf: OPTIONS }],
    [
      'radio-group',
      { options: { component: 'radio-group' } },
      { type: 'string', title: 'Radio group 1', oneOf: OPTIONS },
    ],
    ['checkbox', {}, { type: 'boolean', title: 'Checkbox 1' }],
    ['switch', { options: { component: 'switch' } }, { type: 'boolean', title: 'Switch 1' }],
  ])('builds %s as a label-less Control with its property', (key, extra, property) => {
    expect(buildTemplate(key, EMPTY)).toEqual({
      element: { type: 'Control', ...extra },
      property,
    });
  });

  it('returns undefined for an unknown key', () => {
    expect(buildTemplate('video', EMPTY)).toBeUndefined();
  });

  it('builds fresh objects on every call', () => {
    const first = buildTemplate('combobox', EMPTY);
    const second = buildTemplate('combobox', EMPTY);
    expect(first?.element).not.toBe(second?.element);
    expect(first?.property?.oneOf).not.toBe(second?.property?.oneOf);
  });
});

describe('numbered titles (rule 17)', () => {
  it('is one more than the highest number among exactly matching titles', () => {
    // Deliberately odd titles — authored JSON nothing validates.
    const schema = {
      type: 'object',
      properties: {
        a: { title: 'Text 1' },
        b: { title: 'Text 3' },
        c: { title: 'Text 2 (copy)' },
        d: { title: 'Textarea 7' },
        e: { title: 'text 9' },
        f: { title: 4 },
      },
    } as unknown as JsonSchema;
    expect(nextTitle('Text', schema)).toBe('Text 4');
    expect(nextTitle('Textarea', schema)).toBe('Textarea 8');
    expect(nextTitle('Number', schema)).toBe('Number 1');
  });

  it('numbers from the schema passed to buildTemplate', () => {
    const schema: JsonSchema = { type: 'object', properties: { k: { title: 'Switch 2' } } };
    expect(buildTemplate('switch', schema)?.property?.title).toBe('Switch 3');
  });
});
