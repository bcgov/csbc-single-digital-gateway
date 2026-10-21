import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createDocumentStore, DocumentStudio, STUB_DOCUMENTS } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

/** The stub application: a Funnel (no label) of Eligibility → Details. */
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

/** Deletes a node through the delete gate (doc 234 rule 8): Delete, then confirm. */
async function deleteNode(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('button', { name: `Delete ${name}` }));
  await user.click(
    within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
  );
}

/** Adds through a + (doc 235): open its panel, then choose the option. */
async function addFrom(user: ReturnType<typeof userEvent.setup>, plus: string, option: string) {
  await user.click(await screen.findByRole('button', { name: plus }));
  await user.click(await screen.findByRole('menuitem', { name: option }));
}

const formNode = (container: HTMLElement, label: string) =>
  [...container.querySelectorAll<HTMLElement>('[data-slot="document-studio-form-node"]')].find(
    (node) => node.textContent?.includes(label),
  )!;
const footer = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="document-studio-footer"]')!;
const inspector = () => screen.queryByRole('region', { name: 'Inspector' });

// The node bodies and the pane are clicked with fireEvent: user-event's mousedown reaches d3-zoom, whose nodrag reads
// the event's `view` — null in jsdom. Real buttons on the canvas are `nodrag nopan`, so user-event is fine for those.

const selectedNodes = (container: HTMLElement) =>
  container.querySelectorAll('[data-slot="document-studio-form-node"][data-selected]');
const pathNav = (container: HTMLElement) => within(footer(container)).queryByRole('navigation');

describe('DocumentStudio selection', () => {
  it('has no Content panel, an Inspector with nothing selected, and no path', async () => {
    const { container } = await renderApplication();

    expect(screen.queryByRole('region', { name: 'Content JSON' })).not.toBeInTheDocument();
    expect(inspector()).toBeInTheDocument();
    expect(selectedNodes(container)).toHaveLength(0);
    expect(pathNav(container)).not.toBeInTheDocument();
  });

  it("selects a clicked Form: rings it and shows the flow's route to it in the footer", async () => {
    const { container } = await renderApplication();

    fireEvent.click(formNode(container, 'Details'));

    expect(formNode(container, 'Details')).toHaveAttribute('data-selected');
    expect(formNode(container, 'Eligibility')).not.toHaveAttribute('data-selected');
    const path = within(footer(container)).getByRole('navigation', { name: 'Selection path' });
    expect(
      within(path)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Funnel', 'Eligibility', 'Details']);
    expect(within(path).getByText('Details')).toHaveAttribute('aria-current', 'page');
  });

  it('names a Condition and the branch taken without making it clickable, and selects an earlier Form from its crumb', async () => {
    const { user, container } = await renderApplication();
    await addFrom(user, 'Add after Eligibility', 'Condition');
    await screen.findByRole('button', { name: 'Edit Untitled condition' });

    fireEvent.click(formNode(container, 'Details'));
    const path = within(footer(container)).getByRole('navigation', { name: 'Selection path' });
    expect(
      within(path)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Funnel', 'Eligibility', 'Untitled condition (Default)', 'Details']);
    expect(
      within(path).queryByRole('button', { name: 'Untitled condition (Default)' }),
    ).not.toBeInTheDocument();

    await user.click(within(path).getByRole('button', { name: 'Eligibility' }));
    expect(formNode(container, 'Eligibility')).toHaveAttribute('data-selected');
    expect(formNode(container, 'Details')).not.toHaveAttribute('data-selected');
  });

  it("shows the document's whole content as JSON under Schema", async () => {
    const { user } = await renderApplication();
    const content = STUB_DOCUMENTS.find((d) => d.id === 'stub-application')!.versions[0]!.content;

    await user.click(screen.getByRole('button', { name: 'JSON' }));

    expect(within(inspector()!).getByRole('heading', { level: 2 })).toHaveTextContent('Schema');
    expect(inspector()?.querySelector('pre')?.textContent).toBe(JSON.stringify(content, null, 2));
  });

  it('keeps the view across selecting and deselecting', async () => {
    const { user, container } = await renderApplication();

    await user.click(screen.getByRole('button', { name: 'JSON' }));
    fireEvent.click(formNode(container, 'Details'));
    fireEvent.keyDown(formNode(container, 'Details'), { key: 'Escape' });

    expect(screen.getByRole('button', { name: 'JSON' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears the selection on Escape', async () => {
    const { container } = await renderApplication();
    fireEvent.click(formNode(container, 'Details'));

    fireEvent.keyDown(formNode(container, 'Details'), { key: 'Escape' });

    expect(selectedNodes(container)).toHaveLength(0);
    expect(pathNav(container)).not.toBeInTheDocument();
    expect(inspector()).toBeInTheDocument();
  });

  it('clears the selection from the empty canvas', async () => {
    const { container } = await renderApplication();
    fireEvent.click(formNode(container, 'Details'));

    fireEvent.click(container.querySelector<HTMLElement>('.react-flow__pane')!);

    expect(selectedNodes(container)).toHaveLength(0);
    expect(pathNav(container)).not.toBeInTheDocument();
  });

  it('clears the selection from the root crumb', async () => {
    const { user, container } = await renderApplication();
    fireEvent.click(formNode(container, 'Details'));

    await user.click(within(footer(container)).getByRole('button', { name: 'Funnel' }));

    expect(selectedNodes(container)).toHaveLength(0);
    expect(pathNav(container)).not.toBeInTheDocument();
  });

  it('drops the path to a deleted Form — here to the Form left behind, focused and so selected by default', async () => {
    const { user, container } = await renderApplication();
    fireEvent.click(formNode(container, 'Details'));

    await deleteNode(user, 'Details');

    // Deleting Details collapses the Funnel to Eligibility, which is then focused (doc 233 rules 6, 10).
    await waitFor(() => expect(pathNav(container)).toHaveTextContent('Eligibility'));
    expect(pathNav(container)).not.toHaveTextContent('Details');
  });

  it('does not select a Condition: its card still opens the condition dialog', async () => {
    const { user, container } = await renderApplication();

    await addFrom(user, 'Add after Details', 'Condition');
    await user.click(await screen.findByRole('button', { name: 'Edit Untitled condition' }));

    expect(await screen.findByRole('dialog', { name: 'Edit condition' })).toBeInTheDocument();
    expect(pathNav(container)).not.toBeInTheDocument();
  });

  it('shows no inspector without a document', async () => {
    render(
      <DocumentStudio documentId="missing" store={createDocumentStore({ seed: STUB_DOCUMENTS })} />,
    );

    expect(await screen.findByText('Document not found.')).toBeInTheDocument();
    expect(inspector()).not.toBeInTheDocument();
  });
});
