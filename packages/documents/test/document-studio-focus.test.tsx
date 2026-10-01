import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createDocumentStore, DocumentStudio, STUB_DOCUMENTS } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

const slot = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const formNodes = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('[data-slot="document-studio-form-node"]'),
];
const formNode = (container: HTMLElement, label: string) =>
  formNodes(container).find((node) => node.textContent?.includes(label))!;
const palette = () => screen.queryByRole('region', { name: 'Palette' });
const page = () => screen.queryByRole('article', { name: /page$/ });

function open(documentId: string) {
  const user = userEvent.setup();
  const view = render(
    <DocumentStudio
      documentId={documentId}
      store={createDocumentStore({ seed: STUB_DOCUMENTS })}
    />,
  );
  return { user, ...view };
}

/** Deletes a node through the delete gate (doc 234 rule 8): Delete, then confirm. */
async function deleteNode(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('button', { name: `Delete ${name}` }));
  await user.click(
    within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
  );
}

// Node bodies and the pane take fireEvent, not user-event: see document-studio-selection.test.tsx.
describe('DocumentStudio focus', () => {
  it('opens a top-level Form focused: its node drawn as a page with its + below, the badges kept, no Back', async () => {
    const { container } = open('stub-agreement-template');

    const terms = await screen.findByRole('article', { name: 'Terms of use page' });
    expect(terms.closest('.react-flow__node')).toHaveAttribute('data-id', 'stubAgr1');
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(slot(container, 'document-studio-type')).not.toBeNull();
    expect(formNodes(container)).toHaveLength(1);
    expect(
      await screen.findByRole('group', { name: 'Add after Terms of use' }),
    ).toBeInTheDocument();
  });

  it("leaves a top-level Form's page from its +: the node is added and the page shrinks back into the flow", async () => {
    const { user, container } = open('stub-agreement-template');
    await screen.findByRole('article', { name: 'Terms of use page' });

    await user.click(await screen.findByRole('button', { name: 'Add form after Terms of use' }));

    await waitFor(() => expect(formNodes(container)).toHaveLength(2));
    expect(page()).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(formNode(container, 'Terms of use')).toBeDefined();
  });

  it('opens a Funnel unfocused, and grows a double-clicked Form into its page, selecting it and hiding everything else', async () => {
    const { container } = open('stub-application');
    await screen.findByRole('button', { name: 'Delete Details' });
    expect(page()).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();

    fireEvent.doubleClick(formNode(container, 'Details'));

    // The SAME node becomes the page — no second canvas — and the rest fades out, then leaves the canvas.
    const details = await screen.findByRole('article', { name: 'Details page' });
    expect(details.closest('.react-flow__node')).toHaveAttribute('data-id', 'stubDetl');
    expect(within(details).getByRole('listitem')).toHaveTextContent('Full name');
    await waitFor(() => expect(formNodes(container)).toHaveLength(1));
    expect(container.querySelector('.react-flow__edge')).toBeNull();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    const path = within(slot(container, 'document-studio-footer')!).getByRole('navigation');
    expect(within(path).getByText('Details')).toHaveAttribute('aria-current', 'page');
  });

  it('keeps focus — and the focused Form selected by default — when Escape, the empty canvas or the root crumb clear the selection', async () => {
    const { user, container } = open('stub-application');
    await screen.findByRole('button', { name: 'Delete Details' });
    fireEvent.doubleClick(formNode(container, 'Details'));
    const details = await screen.findByRole('article', { name: 'Details page' });

    await user.click(screen.getByRole('button', { name: 'Funnel' }));
    fireEvent.keyDown(details, { key: 'Escape' });
    fireEvent.click(container.querySelector<HTMLElement>('.react-flow__pane')!);

    expect(screen.getByRole('article', { name: 'Details page' })).toBeInTheDocument();
    const path = within(slot(container, 'document-studio-footer')!).getByRole('navigation');
    expect(within(path).getByText('Details')).toHaveAttribute('aria-current', 'page');
  });

  it('selects a top-level Form focused at open by default, and draws no ring on its page', async () => {
    const { container } = open('stub-agreement-template');
    const terms = await screen.findByRole('article', { name: 'Terms of use page' });

    const path = within(slot(container, 'document-studio-footer')!).getByRole('navigation');
    expect(within(path).getByText('Terms of use')).toHaveAttribute('aria-current', 'page');
    expect(terms.closest('[data-slot="document-studio-form-node"]')).not.toHaveAttribute(
      'data-selected',
    );
  });

  it('zooms back out to the whole flow on Back', async () => {
    const { user, container } = open('stub-application');
    await screen.findByRole('button', { name: 'Delete Details' });
    fireEvent.doubleClick(formNode(container, 'Details'));
    await screen.findByRole('article', { name: 'Details page' });

    await user.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() => expect(formNodes(container)).toHaveLength(2));
    expect(page()).not.toBeInTheDocument();
    expect(screen.getByText('Type: Application Method')).toBeInTheDocument();
  });

  it('ignores a double-click on a Condition', async () => {
    const { user, container } = open('stub-application');
    await user.click(await screen.findByRole('button', { name: 'Add condition after Details' }));
    await screen.findByRole('button', { name: 'Edit Untitled condition' });

    fireEvent.doubleClick(
      container.querySelector<HTMLElement>('[data-slot="document-studio-condition-node"]')!,
    );
    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(page()).not.toBeInTheDocument();
  });

  it('shields the canvas from presses while a Form grows or shrinks, so nothing can strand the camera', async () => {
    const { user, container } = open('stub-application');
    await screen.findByRole('button', { name: 'Delete Details' });
    const shield = () => slot(container, 'document-studio-canvas-shield');
    expect(shield()).toBeNull();

    fireEvent.doubleClick(formNode(container, 'Details'));
    expect(shield()).not.toBeNull();
    await waitFor(() => expect(shield()).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(shield()).not.toBeNull();
    await waitFor(() => expect(shield()).toBeNull());
  });

  it('focuses the Form a Funnel is left with once a delete turns the root into that Form', async () => {
    const { user } = open('stub-application');
    await screen.findByRole('button', { name: 'Delete Details' });
    expect(page()).not.toBeInTheDocument();

    await deleteNode(user, 'Details');

    expect(await screen.findByRole('article', { name: 'Eligibility page' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(await screen.findByRole('group', { name: 'Add after Eligibility' })).toBeInTheDocument();
  });

  it('locks drag-pan in focus, and gives it back to the flow', async () => {
    const { user, container } = open('stub-application');
    await screen.findByRole('button', { name: 'Delete Details' });
    const pane = () => container.querySelector('.react-flow__pane')!;
    expect(pane()).toHaveClass('draggable');

    fireEvent.doubleClick(formNode(container, 'Details'));
    await screen.findByRole('article', { name: 'Details page' });
    expect(pane()).not.toHaveClass('draggable');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(pane()).toHaveClass('draggable'));
  });

  it('floats the Palette on the left only while a Form is focused', async () => {
    const { user, container } = open('stub-application');
    await screen.findByRole('button', { name: 'Delete Details' });
    expect(palette()).not.toBeInTheDocument();

    fireEvent.doubleClick(formNode(container, 'Details'));

    expect(palette()).toHaveClass('absolute', 'top-3', 'left-3');
    expect(within(palette()!).getByRole('heading', { name: 'Palette' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(palette()).not.toBeInTheDocument();
  });

  it('opens one collapsed panel at a time, with the Palette on mdiPalette and the inspector on mdiCog', async () => {
    const { user, container } = open('stub-agreement-template');
    await screen.findByRole('article', { name: 'Terms of use page' });

    await user.click(screen.getByRole('button', { name: 'Open palette' }));
    expect(slot(container, 'document-studio-palette-expanded')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Open inspector' }));
    expect(slot(container, 'document-studio-palette-expanded')).toBeNull();
    expect(slot(container, 'document-studio-inspector-expanded')).not.toBeNull();
  });
});
