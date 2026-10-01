import { describe, expect, it } from 'vitest';
import { pageFields, resolveFocus } from '../src/studio/form-focus';
import { control, edge, form, funnel } from './funnel-fixtures';

const flow = () => funnel([form('A'), form('B')], [edge('e1', 'A', 'B')]);

describe('resolveFocus', () => {
  it('focuses a top-level Form by default, and nothing in a Funnel or an empty variant', () => {
    expect(resolveFocus(form('A'), 'default')).toBe('A');
    expect(resolveFocus(flow(), 'default')).toBeNull();
    expect(resolveFocus({}, 'default')).toBeNull();
  });

  it('focuses a named Form while it exists', () => {
    expect(resolveFocus(flow(), 'B')).toBe('B');
    expect(resolveFocus(form('A'), 'A')).toBe('A');
    expect(resolveFocus(flow(), 'gone')).toBeNull();
    expect(resolveFocus(flow(), 'fun')).toBeNull();
  });

  it('focuses nothing after Back', () => {
    expect(resolveFocus(form('A'), null)).toBeNull();
  });
});

describe('pageFields', () => {
  const schema = { properties: { age: { title: 'Age' }, name: { type: 'string' } } };

  it("lists every Control at any depth: its label, else the property's title, else its key", () => {
    const page = form('A', 'A', [
      control('age'),
      { type: 'VerticalLayout', elements: [control('name'), control('age', 'How old?')] },
    ]);

    expect(pageFields(page, schema)).toEqual(['Age', 'name', 'How old?']);
  });

  it('is empty for a Form with no Controls', () => {
    expect(pageFields(form('A'), schema)).toEqual([]);
  });
});
