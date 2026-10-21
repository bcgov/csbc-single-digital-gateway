import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { StudioDocument } from '../src/types/index';
import { renderSeededStudio, SAMPLE_DOCUMENT } from './render-studio';

/** Doc 219: the seed is normalised, so compare structure with the stamped ids removed. */
const stripIds = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(stripIds);
  if (typeof node !== 'object' || node === null) return node;
  const { id: _id, ...rest } = node as Record<string, unknown>;
  return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, stripIds(v)]));
};

const everyElementHasId = (node: unknown): boolean => {
  if (typeof node !== 'object' || node === null) return true;
  const element = node as { type?: unknown; id?: unknown; elements?: unknown[] };
  if (typeof element.type === 'string' && typeof element.id !== 'string') return false;
  return (element.elements ?? []).every(everyElementHasId);
};

// Doc 218 rules 1-4 — `FormStudio.onDocumentChange`: the studio reporting its document without giving it up.

const itemOf = (element: Element) => {
  const item = element.closest<HTMLElement>('[data-slot="studio-grid-item"]');
  if (!item) throw new Error('not inside a studio grid item');
  return item;
};
const select = (element: Element) => {
  fireEvent.pointerDown(element);
  fireEvent.pointerUp(document);
};
const inspector = () => {
  const node = document.querySelector<HTMLElement>('[data-studio-inspector]');
  if (!node) throw new Error('no inspector');
  return within(node);
};

const lastDocument = (spy: ReturnType<typeof vi.fn>): StudioDocument =>
  spy.mock.calls.at(-1)?.[0] as StudioDocument;

describe('FormStudio onDocumentChange (doc 218 rules 1-4)', () => {
  it('declares the prop on FormStudioProps in the types-only root entry (rule 1)', () => {
    const types = readFileSync(resolve(import.meta.dirname, '../src/types/index.ts'), 'utf8');
    expect(types).toMatch(
      /onDocumentChange\?: \(\(document: StudioDocument\) => void\) \| undefined;/,
    );
  });

  it('reports the document as opened, once, on mount (rule 2)', async () => {
    const onDocumentChange = vi.fn();
    renderSeededStudio({ onDocumentChange });
    await screen.findByRole('textbox', { name: 'Name' });

    expect(onDocumentChange).toHaveBeenCalledTimes(1);
    // The BASELINE, so a host comparing it to the stored content reads clean, not dirty. Doc 219: it is the
    // NORMALISED seed — every id-less element stamped — which is exactly what the host would save.
    const baseline = lastDocument(onDocumentChange) as { schema: unknown; uischema: unknown };
    expect(baseline.schema).toEqual(SAMPLE_DOCUMENT.schema);
    expect(stripIds(baseline.uischema)).toEqual(SAMPLE_DOCUMENT.uischema);
    expect(everyElementHasId(baseline.uischema)).toBe(true);
  });

  it('reports the edited document after an inspector edit (rule 1)', async () => {
    const onDocumentChange = vi.fn();
    renderSeededStudio({ onDocumentChange });
    const name = itemOf(await screen.findByRole('textbox', { name: 'Name' }));

    select(name);
    fireEvent.change(inspector().getByRole('textbox', { name: 'Label' }), {
      target: { value: 'Full name' },
    });

    await waitFor(() => expect(onDocumentChange).toHaveBeenCalledTimes(2));
    expect(JSON.stringify(lastDocument(onDocumentChange).uischema)).toContain('Full name');
  });

  it('does NOT report on a selection change (rule 4)', async () => {
    const onDocumentChange = vi.fn();
    renderSeededStudio({ onDocumentChange });
    const name = itemOf(await screen.findByRole('textbox', { name: 'Name' }));
    const city = itemOf(screen.getByRole('textbox', { name: 'City' }));

    onDocumentChange.mockClear();
    select(name);
    select(city);

    // Selection is studio state, not document state. `useStudioDocument` never re-set, so nothing emits — which is
    // what keeps a host's dirty flag from turning on the moment an author clicks a field.
    expect(onDocumentChange).not.toHaveBeenCalled();
  });

  it('re-reads the callback from a ref, so an inline arrow does not re-subscribe (rule 3)', async () => {
    const onDocumentChange = vi.fn();
    const { rerender } = renderSeededStudio({ onDocumentChange: (doc) => onDocumentChange(doc) });
    await screen.findByRole('textbox', { name: 'Name' });
    expect(onDocumentChange).toHaveBeenCalledTimes(1);

    // A host passing an inline arrow hands the studio a new function identity on every render. Unlike `loadDocument`
    // (doc 200 rule 4b), that must be inert here — otherwise a host re-emits, and re-dirties, for ever.
    const { FormStudio } = await import('../src/studio');
    rerender(
      <FormStudio
        schema={SAMPLE_DOCUMENT.schema}
        uischema={SAMPLE_DOCUMENT.uischema}
        onDocumentChange={(doc) => onDocumentChange(doc)}
      />,
    );
    expect(onDocumentChange).toHaveBeenCalledTimes(1);
  });
});
