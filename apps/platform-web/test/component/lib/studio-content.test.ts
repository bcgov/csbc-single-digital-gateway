import { describe, expect, it } from 'vitest';
import { documentContentOf, sameDocumentContent } from '@/lib/studio-content';

// Docs 218 rule 13, 275 — the boundary between a stored `content` jsonb and a `@repo/documents` DocumentContent.

const schema = { type: 'object', properties: {} };
const root = { type: 'Form', label: 'Apply', elements: [] };
const variants = { default: root };

describe('documentContentOf (docs 218 rule 13, 275)', () => {
  it('returns the schema and variants of a well-formed document', () => {
    expect(documentContentOf({ schema, variants })).toEqual({ schema, variants });
  });

  it('keeps only the document keys, so an extra key can never make a clean document read dirty', () => {
    // The dirty check compares the studio's reported document to this one. A stray key the studio cannot hold
    // would otherwise differ on every render and pin Save draft on for ever.
    expect(documentContentOf({ schema, variants, count: 1 })).toEqual({ schema, variants });
  });

  it('carries an object capability map through', () => {
    const capabilities = { elements: { h1: { edit: 'none' } } };
    expect(documentContentOf({ schema, variants, capabilities })).toEqual({
      schema,
      variants,
      capabilities,
    });
  });

  it('drops a capability map that is not an object', () => {
    expect(documentContentOf({ schema, variants, capabilities: [] })).toEqual({ schema, variants });
  });

  it('keeps other object variants and drops non-object ones', () => {
    const short = { type: 'Form', elements: [] };
    expect(
      documentContentOf({ schema, variants: { default: root, short, broken: null, list: [] } }),
    ).toEqual({ schema, variants: { default: root, short } });
  });

  it.each([
    ['no content at all', undefined],
    ['neither half', {}],
    ['no variants', { schema }],
    ['no schema', { variants }],
    // Doc 275: the shape every version was stored in before — now a notice, not half a document.
    ['the old { schema, uischema } shape', { schema, uischema: root }],
    // The shape the pre-217 multi-stage forms were stored in — exactly what the old JSON editor could leave behind.
    ['a stage-builder document', { stages: [], edges: [] }],
    ['no default variant', { schema, variants: { short: root } }],
    ['a null default variant', { schema, variants: { default: null } }],
    ['an array default variant', { schema, variants: { default: [] } }],
    ['an array variants map', { schema, variants: [root] }],
    ['a primitive schema', { schema: 'object', variants }],
  ])('refuses %s', (_label, content) => {
    expect(documentContentOf(content as Record<string, unknown> | undefined)).toBeNull();
  });
});

// Doc 221 — the comparison a "dirty" flag actually needs. Both cases below reached the BROWSER and
// neither was visible to the component tests, whose fetch mocks hand back the shapes the studio
// produces rather than the ones the server really returns.
describe('sameDocumentContent (doc 221)', () => {
  const capabilities = { elements: { h1: { edit: 'none' } } } as const;
  const doc = (uischema: Record<string, unknown>) => ({ schema, variants: { default: uischema } });

  it('ignores KEY ORDER — the server reorders, the content is the same', () => {
    // `uiSchemaSchema` is `z.object({ type, elements }).catchall(...)`, so a root the studio holds as
    // `type,label,elements,id` comes back as `type,elements,label,id`. A plain JSON.stringify
    // comparison made the page dirty FOREVER after a successful save.
    const held = { type: 'Form', label: 'Apply', elements: [], id: 'root1' };
    const returned = { type: 'Form', elements: [], label: 'Apply', id: 'root1' };
    expect(JSON.stringify(held)).not.toBe(JSON.stringify(returned));
    expect(sameDocumentContent(doc(held), doc(returned))).toBe(true);
  });

  it('ignores key order deep inside the document, not just at the root', () => {
    const a = doc({ type: 'Form', elements: [{ type: 'Heading', id: 'h1', text: 'H' }] });
    const b = doc({ type: 'Form', elements: [{ text: 'H', type: 'Heading', id: 'h1' }] });
    expect(sameDocumentContent(a, b)).toBe(true);
  });

  it('ignores the order of the variants map itself', () => {
    const short = { type: 'Form', elements: [] };
    expect(
      sameDocumentContent(
        { schema, variants: { default: root, short } },
        { variants: { short, default: root }, schema },
      ),
    ).toBe(true);
  });

  it('treats an EMPTY capability map and NO map as the same thing', () => {
    // A template page seeds `capabilities ?? {}` so a template with no rule yet can grow one, and the
    // studio reports that `{}` in its baseline emit. Comparing it against stored content with no such
    // key made the page dirty from the FIRST PAINT, with nothing edited.
    expect(sameDocumentContent({ ...doc(root), capabilities: {} }, doc(root))).toBe(true);
  });

  it('still sees a real capability change', () => {
    expect(sameDocumentContent({ ...doc(root), capabilities }, doc(root))).toBe(false);
  });

  it('still sees a real content change', () => {
    const edited = { type: 'Form', label: 'Renamed', elements: [] };
    expect(sameDocumentContent(doc(root), doc(edited))).toBe(false);
  });

  it('still sees a variant being added', () => {
    const short = { type: 'Form', elements: [] };
    expect(sameDocumentContent(doc(root), { schema, variants: { default: root, short } })).toBe(
      false,
    );
  });

  it('handles either side being null', () => {
    expect(sameDocumentContent(null, null)).toBe(true);
    expect(sameDocumentContent(doc(root), null)).toBe(false);
  });
});
