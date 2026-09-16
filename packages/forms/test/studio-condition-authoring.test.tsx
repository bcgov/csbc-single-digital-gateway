import { describe, expect, it } from 'vitest';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 199 rules 24, 25, 29-32 — authoring a Condition in the Form Studio: inserting one from a +,
// editing its criteria on the card, and how the studio treats it.

useXyflowJsdom();

describe('inserting a Condition (rule 24)', () => {
  it('offers Stage and Condition from a leaf +', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('offers Stage and Condition from an edge +', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('offers Stage ONLY from the origin + of an empty Flow', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('reaches both menu items by keyboard', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('appends a connected Condition and selects it', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('gives the inserted Condition an id unique across Stages and Conditions (rule 15)', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

describe('editing criteria on the card (rules 25-26, 28)', () => {
  it('adds a complete criterion from the Add criterion row', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('disables Add criterion with a hint when nothing is upstream', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('offers only upstream fields in the field picker', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it("offers only the field kind's operators in the operator picker", () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it("offers the field's choice options as the value for a choice field", () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('hides the value control for an operator that needs none', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('removes a criterion and its edges from its row', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

describe('wiring an output (rules 20, 29)', () => {
  it("appends a connected Stage from an unconnected output's +, carrying the criterion as sourceHandle", () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('keeps the sourceHandle when a criterion edge is split by the edge + (rule 29)', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('lets two criteria target the SAME Stage without either being dropped (rule 11)', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

describe('studio integration (rules 30-32)', () => {
  it('names criteria and connections in the delete confirmation', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('gives a Condition the Delete-only actions popover, like a Stage', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('keeps Condition content non-inert but pointer-events-none', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('shows only the Label setting in the inspector for a selected Condition', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});
