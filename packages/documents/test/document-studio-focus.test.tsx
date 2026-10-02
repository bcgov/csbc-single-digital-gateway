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
const wrapperOf = (el: HTMLElement) => el.closest('[data-slot="studio-element"]')!;

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

/** Adds through a + (doc 235): open its panel, then choose the option. */
async function addFrom(user: ReturnType<typeof userEvent.setup>, plus: string, option: string) {
  await user.click(await screen.findByRole('button', { name: plus }));
  await user.click(await screen.findByRole('menuitem', { name: option }));
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
      await screen.findByRole('button', { name: 'Add after Terms of use' }),
    ).toBeInTheDocument();
  });

  it("leaves a top-level Form's page from its +: the node is added and the page shrinks back into the flow", async () => {
    const { user, container } = open('stub-agreement-template');
    await screen.findByRole('article', { name: 'Terms of use page' });

    await addFrom(user, 'Add after Terms of use', 'Form');

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
    // Doc 236: the page renders the Form's elements through the studio renderers — a string Control as its Input
    // (doc 239), drawn inert.
    expect(
      within(details).getByText('Full name').closest('[data-slot="text-field"]'),
    ).toHaveAttribute('data-component', 'input');
    await waitFor(() => expect(formNodes(container)).toHaveLength(1));
    expect(container.querySelector('.react-flow__edge')).toBeNull();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    const path = within(slot(container, 'document-studio-footer')!).getByRole('navigation');
    expect(within(path).getByText('Details')).toHaveAttribute('aria-current', 'page');
  });

  it('edits a Heading in place on an open page and writes it into the Form (doc 236 rules 35-36)', async () => {
    const { container } = open('stub-application');
    await screen.findByRole('button', { name: 'Delete Eligibility' });
    fireEvent.doubleClick(formNode(container, 'Eligibility'));
    const eligibility = await screen.findByRole('article', { name: 'Eligibility page' });
    const heading = () => within(eligibility).getByRole('heading', { level: 2 });
    expect(heading()).toHaveTextContent('Check you can apply');
    // The title is the studio Form renderer's (doc 236 rule 41), not the page's own.
    expect(within(eligibility).getByRole('heading', { level: 1 })).toHaveAttribute(
      'data-slot',
      'form-title',
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    // Only an OPEN page is editable: wait until one click selects the Heading and starts editing it.
    await waitFor(() => {
      fireEvent.click(heading());
      expect(heading()).toHaveAttribute('contenteditable', 'plaintext-only');
    });
    expect(heading().closest('[data-slot="studio-element"]')).toHaveAttribute('data-selected', '');
    heading().textContent = 'Who can apply';
    fireEvent.keyDown(heading(), { key: 'Enter' });

    await waitFor(() => expect(heading()).toHaveTextContent('Who can apply'));
    expect(heading()).not.toHaveAttribute('contenteditable');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('renames a Form from its page title, and the page and its crumb follow (doc 236 rule 42b)', async () => {
    const { container } = open('stub-application');
    await screen.findByRole('button', { name: 'Delete Eligibility' });
    fireEvent.doubleClick(formNode(container, 'Eligibility'));
    const eligibility = await screen.findByRole('article', { name: 'Eligibility page' });
    const title = () => within(eligibility).getByRole('heading', { level: 1 });
    await waitFor(() => {
      fireEvent.click(title());
      expect(title()).toHaveAttribute('contenteditable', 'plaintext-only');
    });
    title().textContent = 'Who can apply';
    fireEvent.keyDown(title(), { key: 'Enter' });

    expect(await screen.findByRole('article', { name: 'Who can apply page' })).toBe(eligibility);
    expect(title()).toHaveTextContent('Who can apply');
    const path = within(slot(container, 'document-studio-footer')!).getByRole('navigation');
    expect(within(path).getByText('Who can apply')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('clears the page selection on a click on the canvas pane or the page whitespace (doc 236 rule 35b)', async () => {
    const { container } = open('stub-application');
    await screen.findByRole('button', { name: 'Delete Eligibility' });
    fireEvent.doubleClick(formNode(container, 'Eligibility'));
    const eligibility = await screen.findByRole('article', { name: 'Eligibility page' });
    const heading = () => within(eligibility).getByRole('heading', { level: 2 });
    const select = () =>
      waitFor(() => {
        fireEvent.click(heading());
        expect(wrapperOf(heading())).toHaveAttribute('data-selected', '');
      });

    await select();
    fireEvent.click(container.querySelector('.react-flow__pane')!);
    expect(wrapperOf(heading())).not.toHaveAttribute('data-selected');

    await select();
    fireEvent.click(eligibility);
    expect(wrapperOf(heading())).not.toHaveAttribute('data-selected');

    // Clicking another element moves the selection to it rather than clearing it.
    await select();
    fireEvent.click(within(eligibility).getByText('Age'));
    expect(wrapperOf(heading())).not.toHaveAttribute('data-selected');
    expect(wrapperOf(within(eligibility).getByText('Age'))).toHaveAttribute('data-selected', '');
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
    await addFrom(user, 'Add after Details', 'Condition');
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
    expect(
      await screen.findByRole('button', { name: 'Add after Eligibility' }),
    ).toBeInTheDocument();
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
