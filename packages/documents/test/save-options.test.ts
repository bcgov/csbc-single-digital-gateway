import { describe, expect, it } from 'vitest';
import type { DocumentContent } from '../src/studio/document-types';
import { conditionsOf } from '../src/studio/funnel-model';
import { saveOptions } from '../src/studio/options/save-options';
import type { OptionsTarget } from '../src/studio/options/options-target';
import { condition, control, form, funnel, row } from './funnel-fixtures';

const target = (multiple: boolean): OptionsTarget => ({
  elementId: 'c-region',
  propertyKey: 'region',
  label: 'Region',
  fieldName: multiple ? 'Multi-select' : 'Select',
  multiple,
  options: [],
  type: 'string',
});

const withRegion = (property: Record<string, unknown>): DocumentContent => ({
  schema: { type: 'object', properties: { region: property, other: { type: 'string' } } },
  variants: {
    default: funnel(
      [form('A', 'A', [control('region')])],
      [],
      [
        condition('c1', [
          row('r1', 'R', [
            { id: 'k', field: 'region', operator: 'equals', value: 'north' } as never,
          ]),
        ]),
      ],
    ),
  },
});

describe('saveOptions (doc 255 rules 7, 11)', () => {
  it('writes oneOf for a single choice, keeping every other keyword', () => {
    const content = withRegion({
      type: 'string',
      title: 'Region',
      oneOf: [{ const: 'north', title: 'North' }],
    });
    const next = saveOptions(
      content,
      target(false),
      [{ const: 'north', title: 'North' }, { const: 'coast' }],
      new Map(),
    );
    expect((next.schema['properties'] as Record<string, unknown>)['region']).toEqual({
      type: 'string',
      title: 'Region',
      oneOf: [{ const: 'north', title: 'North' }, { const: 'coast' }],
    });
    expect(next.variants).toBe(content.variants);
  });

  it('writes items.oneOf for a multiple choice, keeping items.type and uniqueItems', () => {
    const content = withRegion({
      type: 'array',
      uniqueItems: true,
      items: { type: 'string', oneOf: [{ const: 'north' }] },
    });
    const next = saveOptions(content, target(true), [{ const: 'east', title: 'East' }], new Map());
    expect((next.schema['properties'] as Record<string, unknown>)['region']).toEqual({
      type: 'array',
      uniqueItems: true,
      items: { type: 'string', oneOf: [{ const: 'east', title: 'East' }] },
    });
  });

  it('renames clause values in the same content write', () => {
    const content = withRegion({ type: 'string', oneOf: [{ const: 'north' }] });
    const next = saveOptions(
      content,
      target(false),
      [{ const: 'northern' }],
      new Map([['north', 'northern']]),
    );
    expect(conditionsOf(next.variants.default)[0]!.options.rows[0]!.clauses[0]!.value).toBe(
      'northern',
    );
    expect(
      (next.schema['properties'] as Record<string, Record<string, unknown>>)['region']!['oneOf'],
    ).toEqual([{ const: 'northern' }]);
  });
});
