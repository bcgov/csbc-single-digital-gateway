import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';

// Doc 185 rules 15-23 — Copy and Delete from the actions popover, end to end in the studio. The pure
// document updates are covered by studio-copy-element.test.ts and studio-remove-element.test.ts.

const GREETING = 'Hello, FormStudio!';

const itemOf = (element: Element) => {
  const item = element.closest<HTMLElement>('[data-slot="studio-grid-item"]');
  if (!item) throw new Error('not inside a studio grid item');
  return item;
};

const field = (name: string) => screen.getByRole('textbox', { name });
const gone = (name: string) =>
  waitFor(() => expect(screen.queryByRole('textbox', { name })).not.toBeInTheDocument());
const noConfirmation = () =>
  waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
const confirmation = () => screen.findByRole('alertdialog', { name: 'Delete element?' });

async function renderStudio() {
  render(<FormStudio />);
  await screen.findByRole('textbox', { name: 'Name' });
  await screen.findByRole('textbox', { name: 'City' });
}

/** Selects the item holding `element`, then clicks `action` in the (single) actions popover. */
async function selectAnd(element: Element, action: 'Copy' | 'Delete') {
  fireEvent.pointerDown(itemOf(element));
  const menu = await waitFor(() => {
    const menus = screen.getAllByRole('dialog', { name: 'Element actions' });
    expect(menus).toHaveLength(1);
    return menus[0] as HTMLElement;
  });
  fireEvent.click(within(menu).getByRole('button', { name: action }));
}

const deliveryGrid = () =>
  itemOf(
    itemOf(screen.getByRole('heading', { name: 'Delivery address' })).parentElement as HTMLElement,
  );

describe('copy (rules 15-19)', () => {
  it('duplicates a field with its own "(copy)" property and selects the copy', async () => {
    await renderStudio();
    const name = field('Name');
    await selectAnd(name, 'Copy');

    const copy = await screen.findByRole('textbox', { name: 'Name (copy)' });
    expect(copy).not.toBe(name);
    expect(copy.id).not.toBe(name.id);
    expect(itemOf(copy)).toHaveAttribute('data-selected');
    expect(itemOf(name)).not.toHaveAttribute('data-selected');
  });

  it('copies a Grid with every field inside it and selects the copied Grid', async () => {
    await renderStudio();
    const delivery = deliveryGrid();
    await selectAnd(delivery, 'Copy');

    const cityCopy = await screen.findByRole('textbox', { name: 'City (copy)' });
    expect(screen.getByRole('textbox', { name: 'Postal Code (copy)' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Delivery address' })).toHaveLength(2);
    expect(itemOf(itemOf(cityCopy).parentElement as HTMLElement)).toHaveAttribute('data-selected');
    expect(delivery).not.toHaveAttribute('data-selected');
  });

  it('copies a Heading without adding fields', async () => {
    await renderStudio();
    const fields = screen.getAllByRole('textbox').length;
    await selectAnd(screen.getByRole('heading', { level: 1, name: GREETING }), 'Copy');

    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 1, name: GREETING })).toHaveLength(2),
    );
    expect(screen.getAllByRole('textbox')).toHaveLength(fields);
  });
});

describe('delete (rules 21-26)', () => {
  it('asks first: unticked "Don\'t ask me again", Cancel and a destructive Delete', async () => {
    await renderStudio();
    await selectAnd(field('Name'), 'Delete');

    const dialog = await confirmation();
    expect(
      within(dialog).getByText('This element will be removed from the form.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: "Don't ask me again" })).not.toBeChecked();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toHaveClass('text-destructive');
    // The modal dialog hides the page behind it from the accessibility tree, hence `hidden: true`.
    expect(screen.getByRole('textbox', { name: 'Name', hidden: true })).toBeInTheDocument();
  });

  it('describes deleting a Grid as removing everything inside it', async () => {
    await renderStudio();
    await selectAnd(deliveryGrid(), 'Delete');

    const dialog = await confirmation();
    expect(
      within(dialog).getByText('This grid and everything inside it will be removed from the form.'),
    ).toBeInTheDocument();
  });

  it('removes the element on Delete and clears its selection and popover', async () => {
    await renderStudio();
    await selectAnd(field('Name'), 'Delete');
    fireEvent.click(within(await confirmation()).getByRole('button', { name: 'Delete' }));

    await gone('Name');
    await noConfirmation();
    expect(document.querySelectorAll('[data-selected]')).toHaveLength(0);
    await waitFor(() =>
      expect(screen.queryAllByRole('dialog', { name: 'Element actions' })).toHaveLength(0),
    );
  });

  it('removes a Grid with its fields', async () => {
    await renderStudio();
    await selectAnd(deliveryGrid(), 'Delete');
    fireEvent.click(within(await confirmation()).getByRole('button', { name: 'Delete' }));

    await gone('City');
    expect(screen.queryByRole('textbox', { name: 'Postal Code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Delivery address' })).not.toBeInTheDocument();
    expect(field('Name')).toBeInTheDocument();
  });

  it('keeps the element on Cancel', async () => {
    await renderStudio();
    await selectAnd(field('Name'), 'Delete');
    fireEvent.click(within(await confirmation()).getByRole('button', { name: 'Cancel' }));

    await noConfirmation();
    expect(field('Name')).toBeInTheDocument();
    expect(itemOf(field('Name'))).toHaveAttribute('data-selected');
  });

  it('keeps the element and its selection when Escape closes the dialog', async () => {
    await renderStudio();
    await selectAnd(field('Name'), 'Delete');
    fireEvent.keyDown(await confirmation(), { key: 'Escape' });

    await noConfirmation();
    expect(itemOf(field('Name'))).toHaveAttribute('data-selected');
  });

  it('deletes without asking after "Don\'t ask me again" was ticked and confirmed', async () => {
    await renderStudio();
    await selectAnd(field('Name'), 'Delete');
    const dialog = await confirmation();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: "Don't ask me again" }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await gone('Name');
    await noConfirmation();

    await selectAnd(field('About'), 'Delete');
    await gone('About');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('still asks, unticked, when the box was ticked but the dialog cancelled', async () => {
    await renderStudio();
    await selectAnd(field('Name'), 'Delete');
    const dialog = await confirmation();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: "Don't ask me again" }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await noConfirmation();

    await selectAnd(field('Name'), 'Delete');
    const again = await confirmation();
    expect(within(again).getByRole('checkbox', { name: "Don't ask me again" })).not.toBeChecked();
  });

  it('remembers "Don\'t ask me again" through preview mode', async () => {
    await renderStudio();
    await selectAnd(field('Name'), 'Delete');
    const dialog = await confirmation();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: "Don't ask me again" }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await gone('Name');
    await noConfirmation();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await selectAnd(await screen.findByRole('textbox', { name: 'About' }), 'Delete');
    await gone('About');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
