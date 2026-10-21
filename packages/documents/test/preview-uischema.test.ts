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

describe('previewUischema (doc 247 rules 6-8, doc 274 rule 32)', () => {
  it('previews the focused Form alone', () => {
    expect(previewUischema(funnel, 'b')).toBe(funnel.elements[1]);
  });

  it('previews an unfocused Funnel as the Funnel itself, for the Funnel renderer to route', () => {
    expect(previewUischema(funnel, null)).toBe(funnel);
  });

  it('previews a Form root as itself, focused or not', () => {
    const root = form('r', 'Root');
    expect(previewUischema(root, null)).toBe(root);
    expect(previewUischema(root, 'r')).toBe(root);
  });

  it('falls back to the Funnel when the focused id is not a Form', () => {
    expect(previewUischema(funnel, 'gone')).toBe(funnel);
  });

  it('has nothing to preview without Forms', () => {
    expect(previewUischema({}, null)).toBeNull();
    expect(previewUischema({ id: 'f', type: 'Funnel', elements: [] }, null)).toBeNull();
  });
});
