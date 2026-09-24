import { describe, expect, it } from 'vitest';

// Doc 221 — the nine gates. Each is an existing single seam; the work is threading one
// `capabilityFor` lookup to each, not scattering checks.
//
// MDD skeletons: imports added during implementation.

describe('add / move (allowedInLayout’s three call sites)', () => {
  it('refuses an insert into a layout denying addChildren', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('refuses a move of an element denying move', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('refuses a move INTO a layout denying reorderChildren', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('allows both when ungoverned', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  // Rule 4: the capability check is a SECOND gate beside `allowedInLayout`, never inside it —
  // `review-document` asks that function a pure-kind question.
  it('leaves allowedInLayout itself a pure placement rule', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

describe('the drop gate (GridEditor.accepts)', () => {
  it('refuses a drop into a layout denying addChildren', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('refuses a palette template the same way as a moved element', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('accepts when ungoverned', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

describe('delete and copy', () => {
  it('hides Delete for an element denying remove', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('hides Delete when the PARENT denies removeChildren', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it("an element's own remove overrides what its container granted", () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('hides Copy when the parent denies addChildren', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('requestDelete refuses defensively even if a button were reachable', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

describe('drag and resize', () => {
  it('emits gridstack noMove for an element denying move', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('emits noResize where reorderChildren is denied', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('leaves both free when ungoverned', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

describe('the inspector', () => {
  it('offers only the fields `edit` names', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it("offers every field for edit: 'all'", () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it("offers no editable field for edit: 'none'", () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('never offers the Permissions section on a GOVERNED document — that is authoring', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

describe('selectability is DERIVED (rule 3)', () => {
  it('keeps an element selectable when it grants at least one thing', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('refuses selection for an element granting NOTHING', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('a frozen-validation field with an editable label stays selectable', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

describe('the locked treatment (rule 5)', () => {
  it('flags a locked element with data-locked as a PRESENCE flag', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('does not flag a governed-but-editable element', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('uses the arbitrary data-[locked] variant, not data-locked:', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

describe('Flow authoring', () => {
  it('hides the add affordances where addChildren is denied', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('refuses an edge change where edges is denied', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('explains a refused edge through connectionProblem, which already returns WHY', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

// Rule 6: absent for affordances, explained for committed actions.
describe('refusals', () => {
  it('says nothing when an affordance is simply gone', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('explains a refused DRAG through onNotice — the author already committed', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});
