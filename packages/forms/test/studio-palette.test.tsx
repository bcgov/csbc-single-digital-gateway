import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderSeededStudio } from './render-studio';

/** Doc 184 rule 19: entering and leaving preview are two buttons now, so one matcher finds whichever shows. */
const PREVIEW_BUTTON = /^(Preview|Exit preview)$/;

// Doc 189 rules 19, 24-27 — the palette in the Form Studio's left panel, end to end. Drags are verified by hand
// (CLAUDE.md); click-to-add exercises the same insert path.

const itemOf = (element: Element) => {
  const item = element.closest<HTMLElement>('[data-slot="studio-grid-item"]');
  if (!item) throw new Error('not inside a studio grid item');
  return item;
};

const paletteNode = () => document.querySelector<HTMLElement>('[data-studio-palette]');
const inPalette = () => {
  const node = paletteNode();
  if (!node) throw new Error('no palette');
  return within(node);
};
const paletteItem = (name: string) => inPalette().getByRole('button', { name });

const select = (element: Element) => {
  fireEvent.pointerDown(element);
  fireEvent.pointerUp(document);
};

async function renderStudio() {
  const view = renderSeededStudio();
  const name = itemOf(await screen.findByRole('textbox', { name: 'Name' }));
  const city = itemOf(screen.getByRole('textbox', { name: 'City' }));
  return { ...view, name, city };
}

describe('the palette panel (rules 19, 26-27)', () => {
  it('fills the open left panel with Display, Layout and Fields groups of twelve items', async () => {
    await renderStudio();
    const left = document.querySelector('[data-slot="form-studio-left-panel"]');
    expect(left).toContainElement(paletteNode());
    expect(inPalette().getAllByRole('group')).toHaveLength(3);
    expect(inPalette().getByRole('group', { name: 'Display' })).toBeInTheDocument();
    expect(inPalette().getByRole('group', { name: 'Layout' })).toBeInTheDocument();
    expect(inPalette().getByRole('group', { name: 'Fields' })).toBeInTheDocument();
    // Doc 205 rule 40: Multi-select and Checkbox group join the field templates.
    expect(inPalette().getAllByRole('button')).toHaveLength(16);
    expect(inPalette().getByRole('searchbox', { name: 'Search elements' })).toBeInTheDocument();
  });

  it('is removed while previewing and returns afterwards', async () => {
    await renderStudio();
    fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
    await waitFor(() => expect(paletteNode()).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
    await screen.findByRole('textbox', { name: 'Name' });
    expect(paletteNode()).not.toBeNull();
  });

  it('leaves the selection alone when Escape is pressed in the search', async () => {
    const { name } = await renderStudio();
    select(name);
    fireEvent.keyDown(inPalette().getByRole('searchbox'), { key: 'Escape' });
    expect(itemOf(screen.getByRole('textbox', { name: 'Name' }))).toHaveAttribute('data-selected');
  });
});

describe('click-to-add (rules 17, 24-25)', () => {
  it('adds a numbered Text field to the root and selects it when nothing is selected', async () => {
    await renderStudio();
    fireEvent.click(paletteItem('Text'));
    // A new field is required by default, so its label carries JSONForms' asterisk.
    const added = await screen.findByRole('textbox', { name: 'Text 1*' });
    expect(itemOf(added)).toHaveAttribute('data-selected');

    fireEvent.click(paletteItem('Text'));
    expect(await screen.findByRole('textbox', { name: 'Text 2*' })).toBeInTheDocument();
  });

  it('adds into the layout holding the selected element', async () => {
    const { city, container } = await renderStudio();
    select(city);
    fireEvent.click(paletteItem('Heading'));
    // Scoped to the canvas: selecting the new Heading also puts its label in the inspector's <h2>.
    const centre = container.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]');
    const heading = await within(centre as HTMLElement).findByRole('heading', { name: 'Heading' });
    expect(city.closest('.grid-stack')).toContainElement(heading);
    expect(itemOf(heading)).toHaveAttribute('data-selected');
  });

  it('adds with the keyboard', async () => {
    await renderStudio();
    fireEvent.keyDown(paletteItem('Checkbox'), { key: 'Enter' });
    expect(await screen.findByRole('checkbox', { name: 'Checkbox 1' })).toBeInTheDocument();
  });
});
