import { describe, expect, it } from 'vitest';
import { resolveFocus } from '../src/studio/form-focus';
import { edge, form, funnel } from './funnel-fixtures';

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
