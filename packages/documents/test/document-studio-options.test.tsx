import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createDocumentStore, DocumentStudio, STUB_DOCUMENTS } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

const formNode = (container: HTMLElement, label: string) =>
  [...container.querySelectorAll<HTMLElement>('[data-slot="document-studio-form-node"]')].find(
    (node) => node.textContent?.includes(label),
  )!;
const docked = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="document-studio-inspector"]')!;

async function openEligibility() {
  const store = createDocumentStore({ seed: STUB_DOCUMENTS });
  const view = render(<DocumentStudio documentId="stub-application" store={store} />);
  await screen.findByRole('button', { name: 'Delete Eligibility' });
  fireEvent.doubleClick(formNode(view.container, 'Eligibility'));
  const page = await screen.findByRole('article', { name: 'Eligibility page' });
  return { ...view, page };
}

/** Clicks a page element until the open page has selected it. */
async function select(page: HTMLElement, id: string) {
  const element = page.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
  await waitFor(() => {
    fireEvent.click(element);
    expect(element).toHaveAttribute('data-selected');
  });
  return element;
}

const optionsDialog = () => screen.findByRole('dialog', { name: /Edit options/ });

describe('DocumentStudio options editor (doc 255 rules 2-3)', () => {
  it('shows an Options section for a choice field, and none for anything else', async () => {
    const { container, page } = await openEligibility();
    await select(page, 'stubReg1');
    const options = within(docked(container)).getByRole('region', { name: 'Options' });
    expect(options).toHaveTextContent('3 options');
    expect(
      within(options)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Northnorth', 'Interiorinterior', 'Coastcoast']);
    await select(page, 'stubAge1');
    expect(within(docked(container)).queryByRole('region', { name: 'Options' })).toBeNull();
  });

  it('opens from the inspector, and a save writes the options to the document', async () => {
    const { container, page } = await openEligibility();
    await select(page, 'stubReg1');
    await userEvent
      .setup()
      .click(within(docked(container)).getByRole('button', { name: 'Edit options' }));
    const dialog = within(await optionsDialog());
    await waitFor(() =>
      expect(dialog.getByRole('textbox', { name: 'Option 1 label' })).toHaveFocus(),
    );
    fireEvent.click(dialog.getByRole('button', { name: 'Remove option 2' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Save options' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const section = within(docked(container)).getByRole('region', { name: 'Options' });
    expect(section).toHaveTextContent('2 options');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('opens from a double-click on the choice field, and from its action bar', async () => {
    const { page } = await openEligibility();
    const region = await select(page, 'stubReg1');
    fireEvent.doubleClick(region);
    expect(await optionsDialog()).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(within(region).getByRole('button', { name: 'Edit options for Region' }));
    expect(await optionsDialog()).toBeInTheDocument();
  });

  it('offers no Edit options on a field that is not a choice, and its double-click opens nothing', async () => {
    const { page } = await openEligibility();
    const age = await select(page, 'stubAge1');
    expect(within(age).queryByRole('button', { name: /^Edit options/ })).toBeNull();
    fireEvent.doubleClick(age);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
