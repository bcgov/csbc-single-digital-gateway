import { describe, expect, it } from 'vitest';
import { previewUischema } from '../src/studio/preview-uischema';

const form = (id: string, label: string) => ({ id, type: 'Form', label, elements: [] });
const funnel = {
  id: 'fun',
  type: 'Funnel',
  elements: [form('a', 'First'), form('b', 'Second')],
  options: {
    conditions: [{ id: 'c', type: 'Condition', options: { rows: [] } }],
    edges: [{ id: 'e', source: 'a', target: 'b' }],
  },
};

describe('previewUischema (doc 247 rules 6-8)', () => {
  it('previews the focused Form alone', () => {
    expect(previewUischema(funnel, 'b')).toBe(funnel.elements[1]);
  });

  it("stacks a Funnel's Forms in elements order in a VerticalLayout, ignoring conditions and edges", () => {
    const preview = previewUischema(funnel, null);
    expect(preview).toEqual({ type: 'VerticalLayout', elements: funnel.elements });
    expect(preview?.['elements']).not.toBe(funnel.elements);
    expect(JSON.stringify(preview)).not.toContain('Condition');
  });

  it('previews a Form root as itself, focused or not', () => {
    const root = form('r', 'Root');
    expect(previewUischema(root, null)).toBe(root);
    expect(previewUischema(root, 'r')).toBe(root);
  });

  it('falls back to every Form when the focused id is not a Form', () => {
    expect(previewUischema(funnel, 'gone')).toEqual({
      type: 'VerticalLayout',
      elements: funnel.elements,
    });
  });

  it('has nothing to preview without Forms', () => {
    expect(previewUischema({}, null)).toBeNull();
    expect(previewUischema({ id: 'f', type: 'Funnel', elements: [] }, null)).toBeNull();
  });
});
