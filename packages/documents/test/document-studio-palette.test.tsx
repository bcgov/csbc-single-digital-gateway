import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDocumentStore, DocumentStudio, STUB_DOCUMENTS } from '../src/studio';
import { DEFAULT_PALETTE_ITEMS, type PaletteResolver } from '../src/studio/palette-items';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

const formNode = (container: HTMLElement, label: string) =>
  [...container.querySelectorAll<HTMLElement>('[data-slot="document-studio-form-node"]')].find(
    (node) => node.textContent?.includes(label),
  )!;

async function openEligibility(resolver?: PaletteResolver) {
  const store = createDocumentStore({ seed: STUB_DOCUMENTS });
  const view = render(
    <DocumentStudio
      documentId="stub-application"
      store={store}
      {...(resolver && { palette: resolver })}
    />,
  );
  await screen.findByRole('button', { name: 'Delete Eligibility' });
  fireEvent.doubleClick(formNode(view.container, 'Eligibility'));
  const page = await screen.findByRole('article', { name: 'Eligibility page' });
  // The palette only shows while a Form is focused (doc 233 rule 13); both panel forms render its body.
  const palette = (await screen.findAllByRole('region', { name: 'Palette' }))[0]!;
  return { ...view, page, palette };
}

describe('DocumentStudio palette (doc 238)', () => {
  it('lists the default studio renderers when the host passes no palette', async () => {
    const { palette } = await openEligibility();
    expect(
      [...palette.querySelectorAll('[data-palette-item]')].map((el) => el.textContent),
    ).toEqual(['Vertical layout', 'Heading', 'Checkbox', 'Switch']);
  });

  it("calls the host's resolver with the document's type, kind and content", async () => {
    const resolver = vi.fn<PaletteResolver>(() => [DEFAULT_PALETTE_ITEMS[1]!]);
    const { palette } = await openEligibility(resolver);
    expect(resolver).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'services.service-application-method',
        kind: 'document',
        content: expect.objectContaining({ schema: expect.any(Object) }),
      }),
    );
    expect(
      [...palette.querySelectorAll('[data-palette-item]')].map((el) => el.textContent),
    ).toEqual(['Heading']);
  });

  it('appends a clicked Checkbox to the focused Form, with its new schema property', async () => {
    const { page, palette } = await openEligibility();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.click(within(palette).getByRole('button', { name: 'Checkbox' }));

    const fields = await waitFor(() => {
      const all = page.querySelectorAll('[data-slot="boolean-field"]');
      expect(all.length).toBe(5);
      return all;
    });
    const added = fields[fields.length - 1]!;
    expect(added).toHaveTextContent('Untitled checkbox');
    expect(added).toHaveAttribute('data-component', 'checkbox');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('appends a Heading as an empty, editable placeholder at the end of the page', async () => {
    const { page, palette } = await openEligibility();
    fireEvent.keyDown(within(palette).getByRole('button', { name: 'Heading' }), { key: 'Enter' });
    await waitFor(() => {
      const items = [...page.querySelectorAll('[data-slot="studio-vertical-layout"] > [gs-id]')];
      const last = items.at(-1)!;
      expect(last.querySelector('[data-slot="heading-element"]')).toHaveTextContent('Heading');
    });
  });
});
