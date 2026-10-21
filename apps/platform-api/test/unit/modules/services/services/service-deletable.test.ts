import { describe, expect, it } from 'vitest';
import {
  deletableFor,
  SERVICE_HAS_SUBMISSIONS,
} from '../../../../../src/modules/services/services/service-deletable';

// Doc 230 — what may be deleted from a service's edit page. It restates the write paths' guards:
// `remove` refuses a service with submissions; `discardVersion` takes drafts only, never the last.

const v = (id: string, status: 'draft' | 'published' | 'archived') => ({ id, status });

describe('deletableFor (doc 230)', () => {
  it('lets a service with no submissions go, and every draft of several versions', () => {
    expect(deletableFor([v('a', 'archived'), v('b', 'published'), v('c', 'draft')], false)).toEqual(
      { service: true, versionIds: ['c'] },
    );
  });

  it('never offers the only version', () => {
    expect(deletableFor([v('a', 'draft')], false)).toEqual({ service: true, versionIds: [] });
  });

  it('offers no published or archived version on its own', () => {
    expect(deletableFor([v('a', 'archived'), v('b', 'published')], false).versionIds).toEqual([]);
  });

  it('refuses the service with the existing reason when it has submissions', () => {
    const deletable = deletableFor([v('a', 'published'), v('b', 'draft')], true);
    expect(deletable).toEqual({
      service: false,
      reason: SERVICE_HAS_SUBMISSIONS,
      versionIds: ['b'],
    });
    expect(SERVICE_HAS_SUBMISSIONS).toMatch(/archive it instead/);
  });
});
