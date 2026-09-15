import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { canvasFocusId } from '../src/studio/layout/canvas-focus';
import { createElementIds } from '../src/studio/layout/element-ids';

// Doc 196 rule 12 — canvasFocusId: which Form the canvas shows, derived from the selection.

const el = (element: object) => element as UISchemaElement;

const control = el({ type: 'Control', scope: '#/properties/a' });
const grid = el({ type: 'Grid', elements: [control] });
const contact = el({ type: 'Form', label: 'Contact', elements: [grid] });
const applicant = el({ type: 'Stage', options: { id: 's1' }, elements: [contact] });
const FLOW = el({ type: 'Flow', elements: [applicant] });

describe('canvasFocusId (rule 12)', () => {
  it('is null for a Flow root with nothing, the Flow or a Stage selected', () => {
    const ids = createElementIds();
    expect(canvasFocusId(FLOW, null, ids)).toBeNull();
    expect(canvasFocusId(FLOW, ids.idOf(FLOW), ids)).toBeNull();
    expect(canvasFocusId(FLOW, ids.idOf(applicant), ids)).toBeNull();
  });

  it('is the selected Form in a Stage', () => {
    const ids = createElementIds();
    expect(canvasFocusId(FLOW, ids.idOf(contact), ids)).toBe(ids.idOf(contact));
  });

  it('is the nearest Form above a selected element at any depth inside a Form', () => {
    const ids = createElementIds();
    expect(canvasFocusId(FLOW, ids.idOf(grid), ids)).toBe(ids.idOf(contact));
    expect(canvasFocusId(FLOW, ids.idOf(control), ids)).toBe(ids.idOf(contact));
  });

  it('is always null for a Form root, whatever is selected', () => {
    const ids = createElementIds();
    const nested = el({ type: 'Control', scope: '#/properties/b' });
    const root = el({ type: 'Form', elements: [{ type: 'VerticalLayout', elements: [nested] }] });
    expect(canvasFocusId(root, ids.idOf(root), ids)).toBeNull();
    expect(canvasFocusId(root, ids.idOf(nested), ids)).toBeNull();
  });

  it('is null for an unknown selected id', () => {
    expect(canvasFocusId(FLOW, 'el-999', createElementIds())).toBeNull();
  });
});
