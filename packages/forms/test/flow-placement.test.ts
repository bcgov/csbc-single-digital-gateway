import { describe, expect, it } from 'vitest';
import { NESTED_FORM_MESSAGE } from '../src/renderers/gridstack/form-renderer';
import { allowedInLayout, type GridLayoutKind } from '../src/renderers/gridstack/grid-layouts';

// Doc 195 rule 16 — a Flow is only the root, a Stage only in a Flow, a Form only the root or in a Stage.

const KINDS: GridLayoutKind[] = ['grid', 'vertical', 'horizontal'];

describe('placement (rule 16)', () => {
  it('allowedInLayout refuses Flow, Stage and Form in grid, vertical and horizontal layouts', () => {
    for (const kind of KINDS) {
      for (const type of ['Flow', 'Stage', 'Form']) {
        expect(allowedInLayout(type, kind), `${type} in ${kind}`).toBe(false);
      }
    }
  });

  it('keeps the Separator-in-row refusal and allows every other element', () => {
    expect(allowedInLayout('Separator', 'horizontal')).toBe(false);
    expect(allowedInLayout('Separator', 'vertical')).toBe(true);
    for (const kind of KINDS) {
      for (const type of ['Grid', 'VerticalLayout', 'HorizontalLayout', 'Heading', 'Control']) {
        expect(allowedInLayout(type, kind), `${type} in ${kind}`).toBe(true);
      }
    }
  });

  it('words the nested-Form error "A Form can only be the root element or sit in a Stage."', () => {
    expect(NESTED_FORM_MESSAGE).toBe('A Form can only be the root element or sit in a Stage.');
  });
});
