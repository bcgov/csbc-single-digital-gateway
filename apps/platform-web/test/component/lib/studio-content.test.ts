import { describe, expect, it } from 'vitest';
import { studioDocumentOf } from '@/lib/studio-content';

// Doc 218 rule 13 — the boundary between a stored `content` jsonb and a `@repo/forms` StudioDocument.

const schema = { type: 'object', properties: {} };
const uischema = { type: 'Form', label: 'Apply', elements: [] };

describe('studioDocumentOf (doc 218 rule 13)', () => {
  it('returns both halves of a well-formed document', () => {
    expect(studioDocumentOf({ schema, uischema })).toEqual({ schema, uischema });
  });

  it('keeps only the two halves, so an extra key can never make a clean document read dirty', () => {
    // Rule 11 compares the studio's reported document to this one by JSON. A stray key the studio cannot hold
    // would otherwise differ on every render and pin Save draft on for ever.
    expect(studioDocumentOf({ schema, uischema, count: 1 })).toEqual({ schema, uischema });
  });

  it.each([
    ['no content at all', undefined],
    ['neither half', {}],
    ['no uischema', { schema }],
    ['no schema', { uischema }],
    // The shape the pre-217 multi-stage forms were stored in — exactly what the old JSON editor could leave behind.
    ['a stage-builder document', { stages: [], edges: [] }],
    ['a null half', { schema, uischema: null }],
    ['an array half', { schema, uischema: [] }],
    ['a primitive half', { schema: 'object', uischema }],
  ])('refuses %s', (_label, content) => {
    expect(studioDocumentOf(content as Record<string, unknown> | undefined)).toBeNull();
  });
});
