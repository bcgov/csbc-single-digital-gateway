import { describe, expect, it } from 'vitest';

// Doc 221 — the GOVERNING capability map reaches the studio through a provider, never as seeded
// document state.
//
// It mirrors StudioSelection / GridEditor / FlowEditor / TabsEditor exactly, including the default:
// NO PROVIDER = UNGOVERNED, as those give "no provider = view-only". That default is what keeps every
// untemplated document — and /admin/studio — behaving exactly as it does today.
//
// MDD skeletons: imports added during implementation.

describe('useCapabilities', () => {
  it('returns no map when there is no provider — ungoverned (rule 1)', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('returns the provided map inside a CapabilityProvider', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('resolves an element through capabilityFor, not by reading the map directly', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

describe('the ungoverned default', () => {
  it('grants every verb when no provider is present', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('grants every verb for an element the map has never heard of (rule 2)', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('a studio with no provider offers every affordance, exactly as today', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

// The governing map and the AUTHORED map (doc 220) are different channels. Conflating them would
// make a host save the template's capabilities into the derived document.
describe('the two channels stay separate', () => {
  it('a governing map is NOT reported through onDocumentChange', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('a provider does not put capabilities into the edited document', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('a template being AUTHORED still carries its map as a document half, not a provider', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});

// Doc 218's trap lives in this machinery: the map must never reach the re-seed comparison.
describe('identity', () => {
  it('a new map object does not clear element ids or the selection', () => {
    expect.fail('Not implemented — MDD skeleton');
  });

  it('write-path gates read the LATEST map without the editor changing identity', () => {
    expect.fail('Not implemented — MDD skeleton');
  });
});
