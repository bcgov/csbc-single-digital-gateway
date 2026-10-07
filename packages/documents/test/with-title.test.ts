import { describe, expect, it } from 'vitest';
import { withTitle, type DocumentContent } from '../src/content';

// A document created from a template takes its title on EVERY variant (2026-10-07), not only default.

const content = (): DocumentContent => ({
  schema: { type: 'object', properties: {} },
  variants: {
    default: { id: 'F', type: 'Form', label: 'Template', elements: [] },
    Citizen: { id: 'C', type: 'Funnel', elements: [], options: { displayOnly: true } },
  },
  capabilities: { default: 'granted' } as never,
});

describe('withTitle', () => {
  it("stamps the title on every variant's root, keeping everything else", () => {
    const next = withTitle(content(), 'Permit');
    expect(next.variants).toEqual({
      default: { id: 'F', type: 'Form', label: 'Permit', elements: [] },
      Citizen: {
        id: 'C',
        type: 'Funnel',
        label: 'Permit',
        elements: [],
        options: { displayOnly: true },
      },
    });
    expect(next.capabilities).toEqual({ default: 'granted' });
  });

  it('leaves the given content untouched', () => {
    const before = content();
    withTitle(before, 'Permit');
    expect(before.variants['default']!['label']).toBe('Template');
  });
});
