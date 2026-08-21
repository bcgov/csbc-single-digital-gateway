import { describe, expect, it } from 'vitest';

/**
 * MDD skeletons — feature 176, the `SubtreeSectionEditor` half of the flow layout.
 *
 * This is where the HIGH consistency issue from the data-flow analysis is resolved: `BasicRunner`
 * renders its own Submit after the page, so a flow-variant subtree would otherwise show TWO action
 * bars. The editor mounts `FlowActionProvider` INSTEAD of passing `onSubmit` — `FormRunner` already
 * treats an absent `onSubmit` as no-submit preview mode, so no `FormRunner` change is needed and the
 * citizen application path is untouched. Imports are added in Phase 6.
 */

describe('SubtreeSectionEditor — flow-variant subtree', () => {
  it('mounts a FlowActionProvider so the flow layout renders its save bar', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it("renders NO FormRunner Submit button (only the flow bar's save affordances)", () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('persists through updateDraft with the whole merged data object when Save & next runs', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('leaves the keys outside this window intact in the saved payload', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('surfaces a save failure without closing the window', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('closes the window when Save & exit resolves', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

describe('SubtreeSectionEditor — non-flow subtree (regression)', () => {
  it('still renders the FormRunner Submit button as before', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('still mounts no FlowActionProvider', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('still saves and closes through the existing Submit path', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});
