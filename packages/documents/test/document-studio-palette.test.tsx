import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDocumentStore, DocumentStudio, STUB_DOCUMENTS } from '../src/studio';
import { DEFAULT_PALETTE_ITEMS, type PaletteResolver } from '../src/studio/palette-items';
import { dropFrom, type Grid } from './grid-move';
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
    ).toEqual([
      'Vertical layout',
      'Horizontal layout',
      'Grid',
      'Heading',
      'Separator',
      'Rich content',
      'Table',
      'Checkbox',
      'Switch',
      'Text',
      'Text area',
      'Rich text',
      'Number',
      'Select',
      'Radio group',
      'Multi-select',
      'Checkbox group',
      'Data table',
    ]);
  });

  it("calls the host's resolver with the document's type, kind and content", async () => {
    const resolver = vi.fn<PaletteResolver>(() => [
      DEFAULT_PALETTE_ITEMS.find((item) => item.id === 'heading')!,
    ]);
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

describe('DocumentStudio palette click by page selection (doc 238 rule 16)', () => {
  it('puts a clicked item inside a selected nested layout, and right after a selected field', async () => {
    const { page, palette } = await openEligibility();
    fireEvent.click(within(palette).getByRole('button', { name: /Vertical layout/ }));
    const layout = await waitFor(() => {
      const found = page.querySelector<HTMLElement>('[data-element-type="VerticalLayout"]');
      expect(found).not.toBeNull();
      return found!;
    });
    // Only an OPEN page selects: wait until a click marks the layout selected.
    await waitFor(() => {
      fireEvent.click(layout);
      expect(layout).toHaveAttribute('data-selected');
    });
    fireEvent.click(within(palette).getByRole('button', { name: 'Checkbox' }));
    await waitFor(() =>
      expect(layout.querySelector('[data-slot="boolean-field"]')).toBeInTheDocument(),
    );

    fireEvent.click(page.querySelector('[data-element-id="stubHdg1"]')!);
    fireEvent.click(within(palette).getByRole('button', { name: 'Heading' }));
    await waitFor(() => {
      const root = page.querySelector('[data-slot="studio-vertical-layout"]')!;
      const items = [...root.querySelectorAll(':scope > [gs-id]')];
      expect(items[0]!.getAttribute('gs-id')).toBe('stubHdg1');
      expect(items[1]!.querySelector('[data-slot="heading-element"]')).toHaveTextContent('Heading');
    });
  });
});

describe('DocumentStudio element delete (doc 242)', () => {
  it('deletes a Control through the gate, leaving the rest of the page', async () => {
    const { page } = await openEligibility();
    // Only an OPEN page is editable, so its elements offer actions once it has settled.
    const actions = await waitFor(() => {
      const row = page.querySelector<HTMLElement>(
        '[data-element-id="stubCns1"] > [data-slot="studio-element-actions"]',
      );
      expect(row).not.toBeNull();
      return row!;
    });
    const button = within(actions).getByRole('button', { name: /^Delete / });

    fireEvent.click(button);
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete element?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(page.querySelector('[data-element-id="stubCns1"]')).not.toBeInTheDocument(),
    );
    // Only the deleted element goes; the schema clean-up itself is pinned in element-remove.test.ts.
    expect(page.querySelector('[data-element-id="stubAge1"]')).toBeInTheDocument();
  });

  it('keeps the element when the gate is cancelled', async () => {
    const { page } = await openEligibility();
    fireEvent.click(
      await within(page).findByRole('button', { name: 'Delete Check you can apply' }),
    );
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete element?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(page.querySelector('[data-element-id="stubHdg1"]')).toBeInTheDocument();
  });
});

describe('DocumentStudio element move (doc 243)', () => {
  it('moves a page element into a nested layout and back out', async () => {
    const { page, palette } = await openEligibility();
    fireEvent.click(within(palette).getByRole('button', { name: /Vertical layout/ }));
    const innerGrid = () =>
      page.querySelector<Grid>(
        '[data-element-type="VerticalLayout"] [data-slot="studio-vertical-layout"]',
      );
    await waitFor(() => expect(innerGrid()).not.toBeNull());
    // Only an OPEN page moves: wait until its grids accept another grid's items.
    const rootGrid = page.querySelector<Grid>('[data-slot="studio-vertical-layout"]')!;
    const consent = () =>
      page
        .querySelector<HTMLElement>('[data-element-id="stubCns1"]')!
        .closest<HTMLElement>('.grid-stack-item')!;
    await waitFor(() => {
      const accepts = innerGrid()!.gridstack.opts.acceptWidgets;
      expect(typeof accepts === 'function' && accepts(consent())).toBe(true);
    });

    dropFrom(rootGrid, innerGrid()!, consent() as never, 0);
    await waitFor(() =>
      expect(innerGrid()!.querySelector('[data-element-id="stubCns1"]')).toBeInTheDocument(),
    );
    expect(page.querySelector('[data-element-id="stubCns1"]')).toHaveAttribute('data-selected');

    const root = page.querySelector<Grid>('[data-slot="studio-vertical-layout"]')!;
    dropFrom(innerGrid()!, root, consent() as never, 0);
    await waitFor(() =>
      expect(innerGrid()!.querySelector('[data-element-id="stubCns1"]')).not.toBeInTheDocument(),
    );
    // Back at the top of the page — the root grid is a NEW grid after the move (doc 236 rule 30).
    const rootNow = page.querySelector<Grid>('[data-slot="studio-vertical-layout"]')!;
    expect(rootNow).not.toBe(root);
    expect(rootNow.querySelector(':scope > .grid-stack-item')).toBe(consent());
  });
});
