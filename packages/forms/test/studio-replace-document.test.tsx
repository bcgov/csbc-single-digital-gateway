import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { act, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { describe, it, expect } from 'vitest';
import { useStudioDocument } from '../src/studio/use-studio-document';
import { useStudioSelection } from '../src/studio/use-studio-selection';

// Doc 191 rules 22-24 — useStudioDocument.replaceDocument.

const el = (element: object) => element as UISchemaElement;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const SCHEMA: JsonSchema = { type: 'object', properties: { a: { type: 'string', title: 'A' } } };
const UISCHEMA = el({
  type: 'VerticalLayout',
  elements: [
    el({ type: 'Heading', text: 'H' }),
    el({ type: 'Grid', elements: [el({ type: 'Control', scope: '#/properties/a' })] }),
  ],
});
// One stable source object: a new object per render would reset the document (doc 183 rule 2).
const SOURCE = { schema: SCHEMA, uischema: UISCHEMA };

/** The document and selection hooks paired the way FormStudio pairs them. */
function useStudio() {
  const rootRef = useRef<HTMLDivElement>(null);
  const document = useStudioDocument(SOURCE);
  const selection = useStudioSelection(rootRef, true, document);
  return { document, selection };
}

describe('useStudioDocument replaceDocument (doc 191)', () => {
  describe('replacing halves (rule 22)', () => {
    it('replaces only the schema when given only a schema', () => {
      const { result } = renderHook(() => useStudioDocument(SOURCE));
      const next: JsonSchema = {
        type: 'object',
        properties: { a: { type: 'string', title: 'Renamed' } },
      };
      // Doc 219: the studio holds the NORMALISED seed, so identity is against that, not the raw prop.
      const seeded = result.current.uischema;
      act(() => result.current.replaceDocument({ schema: next }));
      expect(result.current.schema).toBe(next);
      expect(result.current.uischema).toBe(seeded);
      expect(result.current.pathOf(null)).toHaveLength(1);
    });

    it('replaces only the uischema when given only a uischema', () => {
      const { result } = renderHook(() => useStudioDocument(SOURCE));
      // Doc 219: build from the SEEDED (stamped) document, as a code-panel round-trip does — then every
      // element already has an id, `stampMissingIds` is a no-op, and identity is preserved.
      const next = copy(result.current.uischema) as UISchemaElement & {
        elements: { text?: string }[];
      };
      next.elements[0] = { ...next.elements[0], text: 'Changed' };
      act(() => result.current.replaceDocument({ uischema: next }));
      expect(result.current.uischema).toBe(next);
      expect(result.current.schema).toBe(SCHEMA);
    });

    it('keeps the current objects when both halves are structurally equal', () => {
      const { result } = renderHook(() => useStudioDocument(SOURCE));
      const before = result.current;
      // Doc 219: the code panel shows the NORMALISED document, so what it applies back carries the ids.
      // Copying the seeded uischema is what a real round-trip through the panel looks like.
      const seeded = result.current.uischema;
      act(() => result.current.replaceDocument({ schema: copy(SCHEMA), uischema: copy(seeded) }));
      expect(result.current.schema).toBe(SCHEMA);
      expect(result.current.uischema).toBe(seeded);
      expect(result.current.elementTypes).toBe(before.elementTypes);
      expect(result.current.inspectorFor).toBe(before.inspectorFor);
    });
  });

  describe('ids and seed (rules 23-24)', () => {
    it('keeps element ids and rootId for elements at the same path and type', () => {
      const { result } = renderHook(() => useStudioDocument(SOURCE));
      const { rootId, elementTypes } = result.current;
      const next = copy(UISCHEMA) as UISchemaElement & { elements: { text?: string }[] };
      next.elements[0] = { ...next.elements[0], text: 'Changed' };
      act(() => result.current.replaceDocument({ uischema: next }));
      expect(result.current.rootId).toBe(rootId);
      expect([...result.current.elementTypes]).toEqual([...elementTypes]);
    });

    it('never changes the seed', () => {
      const { result } = renderHook(() => useStudioDocument(SOURCE));
      const { seed } = result.current;
      act(() =>
        result.current.replaceDocument({
          schema: { type: 'object', properties: {} },
          uischema: el({ type: 'Grid', elements: [] }),
        }),
      );
      expect(result.current.uischema.type).toBe('Grid');
      expect(result.current.seed).toBe(seed);
    });

    it('keeps the selection in FormStudio after a uischema replacement that keeps the selected element', () => {
      const { result } = renderHook(() => useStudio());
      const [, gridId] = [...result.current.document.elementTypes.keys()];
      expect(gridId).toBeDefined();
      act(() => result.current.selection.select(gridId ?? null));
      expect(result.current.selection.port.selectedId).toBe(gridId);

      const next = copy(result.current.document.uischema) as UISchemaElement & {
        elements: { text?: string }[];
      };
      next.elements[0] = { ...next.elements[0], text: 'Changed' };
      act(() => result.current.document.replaceDocument({ uischema: next }));
      expect(result.current.document.uischema).toBe(next);
      expect(result.current.selection.port.selectedId).toBe(gridId);
    });

    it('clears the selection when the selected element no longer exists', () => {
      const { result } = renderHook(() => useStudio());
      const [, gridId] = [...result.current.document.elementTypes.keys()];
      act(() => result.current.selection.select(gridId ?? null));
      expect(result.current.selection.port.selectedId).toBe(gridId);

      const next = el({ type: 'VerticalLayout', elements: [el({ type: 'Heading', text: 'H' })] });
      act(() => result.current.document.replaceDocument({ uischema: next }));
      expect(result.current.document.elementTypes.has(gridId ?? '')).toBe(false);
      expect(result.current.selection.port.selectedId).toBeNull();
    });
  });
});
