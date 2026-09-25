import { describe, expect, it } from 'vitest';
import { sameStudioDocument, studioDocumentOf } from '@/lib/studio-content';

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

// Doc 221 — the comparison a "dirty" flag actually needs. Both cases below reached the BROWSER and
// neither was visible to the component tests, whose fetch mocks hand back the shapes the studio
// produces rather than the ones the server really returns.
describe('sameStudioDocument (doc 221)', () => {
  const capabilities = { elements: { h1: { edit: 'none' } } } as const;

  it('ignores KEY ORDER — the server reorders, the content is the same', () => {
    // `uiSchemaSchema` is `z.object({ type, elements }).catchall(...)`, so a root the studio holds as
    // `type,label,elements,id` comes back as `type,elements,label,id`. A plain JSON.stringify
    // comparison made the page dirty FOREVER after a successful save.
    const held = { type: 'Form', label: 'Apply', elements: [], id: 'root1' };
    const returned = { type: 'Form', elements: [], label: 'Apply', id: 'root1' };
    expect(JSON.stringify(held)).not.toBe(JSON.stringify(returned));
    expect(sameStudioDocument({ schema, uischema: held }, { schema, uischema: returned })).toBe(
      true,
    );
  });

  it('ignores key order deep inside the document, not just at the root', () => {
    const a = {
      schema,
      uischema: { type: 'Form', elements: [{ type: 'Heading', id: 'h1', text: 'H' }] },
    };
    const b = {
      schema,
      uischema: { type: 'Form', elements: [{ text: 'H', type: 'Heading', id: 'h1' }] },
    };
    expect(sameStudioDocument(a, b)).toBe(true);
  });

  it('treats an EMPTY capability map and NO map as the same thing', () => {
    // A template page seeds `capabilities ?? {}` so a template with no rule yet can grow one, and the
    // studio reports that `{}` in its baseline emit. Comparing it against stored content with no such
    // key made the page dirty from the FIRST PAINT, with nothing edited.
    expect(sameStudioDocument({ schema, uischema, capabilities: {} }, { schema, uischema })).toBe(
      true,
    );
  });

  it('still sees a real capability change', () => {
    expect(sameStudioDocument({ schema, uischema, capabilities }, { schema, uischema })).toBe(
      false,
    );
  });

  it('still sees a real content change', () => {
    const edited = { type: 'Form', label: 'Renamed', elements: [] };
    expect(sameStudioDocument({ schema, uischema }, { schema, uischema: edited })).toBe(false);
  });

  it('handles either side being null', () => {
    expect(sameStudioDocument(null, null)).toBe(true);
    expect(sameStudioDocument({ schema, uischema }, null)).toBe(false);
  });
});
