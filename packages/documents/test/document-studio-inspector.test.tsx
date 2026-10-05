import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore, DocumentStudio, STUB_DOCUMENTS } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

const formNode = (container: HTMLElement, label: string) =>
  [...container.querySelectorAll<HTMLElement>('[data-slot="document-studio-form-node"]')].find(
    (node) => node.textContent?.includes(label),
  )!;

/** The docked inspector's target line. */
const kind = (container: HTMLElement) =>
  container.querySelector('[data-slot="document-studio-inspector"] [data-slot="inspector-kind"]');
const propertyKey = (container: HTMLElement) =>
  container.querySelector('[data-slot="document-studio-inspector"] [data-slot="property-key"]');
const title = (container: HTMLElement) =>
  within(docked(container)).queryByRole('textbox', { name: 'Title' });

const docked = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="document-studio-inspector"]')!;

async function openApplication() {
  const store = createDocumentStore({ seed: STUB_DOCUMENTS });
  const view = render(<DocumentStudio documentId="stub-application" store={store} />);
  await screen.findByRole('button', { name: 'Delete Eligibility' });
  return view;
}

async function focusEligibility(container: HTMLElement) {
  fireEvent.doubleClick(formNode(container, 'Eligibility'));
  return screen.findByRole('article', { name: 'Eligibility page' });
}

/** Clicks a page element until the open page has selected it. */
async function selectOnPage(page: HTMLElement, id: string) {
  const element = page.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
  await waitFor(() => {
    fireEvent.click(element);
    expect(element).toHaveAttribute('data-selected');
  });
}

describe('DocumentStudio inspector (doc 249)', () => {
  it('inspects the root Funnel with nothing selected and no Form focused', async () => {
    const { container } = await openApplication();
    expect(kind(container)).toHaveTextContent(/^Funnel$/);
    expect(propertyKey(container)).toBeNull();
    expect(within(docked(container)).getByRole('textbox', { name: 'Name' })).toHaveValue('');
  });

  it('inspects a selected Form and a focused Form', async () => {
    const { container } = await openApplication();
    fireEvent.click(formNode(container, 'Details'));
    await waitFor(() => expect(title(container)).toHaveValue('Details'));
    expect(kind(container)).toHaveTextContent(/^Form$/);
    await focusEligibility(container);
    await waitFor(() => expect(title(container)).toHaveValue('Eligibility'));
    expect(kind(container)).toHaveTextContent(/^Form$/);
    expect(within(docked(container)).getByRole('textbox', { name: 'Title' })).toHaveValue(
      'Eligibility',
    );
  });

  it('inspects a selected page element, and falls back to the Form after it is deleted', async () => {
    const { container } = await openApplication();
    const page = await focusEligibility(container);
    await selectOnPage(page, 'stubCns1');
    expect(kind(container)).toHaveTextContent(/^Checkbox$/);
    expect(propertyKey(container)).toHaveTextContent(/^consent$/);

    fireEvent.click(within(page).getByRole('button', { name: 'Delete I agree to the terms' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete element?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(kind(container)).toHaveTextContent(/^Form$/));
    expect(title(container)).toHaveValue('Eligibility');
  });

  it('renaming a control in the inspector updates the page and marks the studio dirty', async () => {
    const { container } = await openApplication();
    const page = await focusEligibility(container);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await selectOnPage(page, 'stubAge1');
    const label = within(docked(container)).getByRole('textbox', { name: 'Label' });

    fireEvent.change(label, { target: { value: 'Your age' } });

    await waitFor(() =>
      expect(page.querySelector('[data-element-id="stubAge1"]')).toHaveTextContent('Your age'),
    );
    expect(kind(container)).toHaveTextContent(/^Number$/);
    expect(propertyKey(container)).toHaveTextContent(/^age$/);
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});
