import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createDocumentStore, DocumentStudio, STUB_DOCUMENTS } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

/** The stub application: a Funnel of Eligibility → Details, shown as the flow. */
async function renderApplication() {
  const user = userEvent.setup();
  const view = render(
    <DocumentStudio
      documentId="stub-application"
      store={createDocumentStore({ seed: STUB_DOCUMENTS })}
    />,
  );
  await screen.findByRole('button', { name: 'Delete Details' });
  return { user, ...view };
}

const formNodes = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('[data-slot="document-studio-form-node"]'),
];
const formNode = (container: HTMLElement, label: string) =>
  formNodes(container).find((node) => node.textContent?.includes(label))!;
const actionsOf = (node: HTMLElement) =>
  node.querySelector<HTMLElement>('[data-slot="document-studio-node-actions"]');
const gate = () => screen.queryByRole('alertdialog');

describe('DocumentStudio node actions (doc 234)', () => {
  it('gives a Form Edit, Inspect and Delete, its card the hover group, and no corner delete (rules 1, 3)', async () => {
    const { container } = await renderApplication();

    const details = formNode(container, 'Details');
    expect(details).toHaveClass('group/node');
    expect(
      within(actionsOf(details)!)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Edit Details', 'Inspect Details', 'Delete Details']);
    expect(container.querySelector('[data-slot="document-studio-delete-node"]')).toBeNull();
  });

  it("shows a selected Form's actions without hover (rule 2)", async () => {
    const { container } = await renderApplication();
    expect(actionsOf(formNode(container, 'Details'))).not.toHaveAttribute('data-shown');

    fireEvent.click(formNode(container, 'Details'));

    expect(actionsOf(formNode(container, 'Details'))).toHaveAttribute('data-shown');
    expect(actionsOf(formNode(container, 'Eligibility'))).not.toHaveAttribute('data-shown');
  });

  it('gives a Condition Edit and Delete; Edit opens its dialog, and so does its card, now named Open (rules 3, 6)', async () => {
    const { user } = await renderApplication();
    await user.click(screen.getByRole('button', { name: 'Add condition after Eligibility' }));
    const card = await screen.findByRole('button', { name: 'Open Untitled condition' });
    const node = card.closest<HTMLElement>('[data-slot="document-studio-condition-node"]')!;

    expect(
      within(actionsOf(node)!)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Edit Untitled condition', 'Delete Untitled condition']);

    await user.click(within(node).getByRole('button', { name: 'Edit Untitled condition' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit condition' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await user.click(card);
    expect(await screen.findByRole('dialog', { name: 'Edit condition' })).toBeInTheDocument();
  });

  it("opens a Form's page from Edit, as a double-click does, and the page shows no actions (rules 4, 5)", async () => {
    const { user, container } = await renderApplication();

    await user.click(screen.getByRole('button', { name: 'Edit Details' }));

    const details = await screen.findByRole('article', { name: 'Details page' });
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(
      actionsOf(details.closest<HTMLElement>('[data-slot="document-studio-form-node"]')!),
    ).toBeNull();
    await waitFor(() => expect(formNodes(container)).toHaveLength(1));
  });

  it('selects a Form from Inspect and reveals the inspector, focused (rule 7)', async () => {
    const { user, container } = await renderApplication();

    await user.click(screen.getByRole('button', { name: 'Inspect Details' }));

    expect(formNode(container, 'Details')).toHaveAttribute('data-selected');
    const footer = container.querySelector<HTMLElement>('[data-slot="document-studio-footer"]')!;
    expect(within(footer).getByText('Details')).toHaveAttribute('aria-current', 'page');
    // jsdom lays nothing out, so the docked panel has no client rects and the collapsed path is taken.
    const expanded = container.querySelector<HTMLElement>(
      '[data-slot="document-studio-inspector-expanded"]',
    );
    expect(expanded).not.toBeNull();
    await waitFor(() => expect(expanded).toHaveFocus());
  });

  it('asks before a delete: Cancel keeps the Form, Delete removes it (rule 8)', async () => {
    const { user, container } = await renderApplication();
    await user.click(screen.getByRole('button', { name: 'Add form after Details' }));
    await waitFor(() => expect(formNodes(container)).toHaveLength(3));

    await user.click(screen.getByRole('button', { name: 'Delete Details' }));
    await user.click(
      within(await screen.findByRole('alertdialog', { name: 'Delete form?' })).getByRole('button', {
        name: 'Cancel',
      }),
    );
    await waitFor(() => expect(gate()).not.toBeInTheDocument());
    expect(formNodes(container)).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Delete Details' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );

    await waitFor(() => expect(formNodes(container)).toHaveLength(2));
    expect(formNode(container, 'Details')).toBeUndefined();
  });

  it('stops asking for the rest of the mount once "Don\'t ask me again" is confirmed (rule 9)', async () => {
    const { user, container } = await renderApplication();
    await user.click(screen.getByRole('button', { name: 'Add form after Details' }));
    await user.click(await screen.findByRole('button', { name: 'Add form after Untitled form' }));
    await waitFor(() => expect(formNodes(container)).toHaveLength(4));

    await user.click(screen.getByRole('button', { name: 'Delete Details' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('checkbox', { name: "Don't ask me again" }));
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(formNodes(container)).toHaveLength(3));

    await user.click(screen.getAllByRole('button', { name: 'Delete Untitled form' })[0]!);

    await waitFor(() => expect(formNodes(container)).toHaveLength(2));
    expect(gate()).not.toBeInTheDocument();
  });
});
