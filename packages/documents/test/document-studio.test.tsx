import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createDocumentStore, DocumentStudio, STUB_DOCUMENTS } from '../src/studio';

const slot = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-slot="${name}"]`);

const seededStore = () => createDocumentStore({ seed: STUB_DOCUMENTS });

describe('DocumentStudio', () => {
  it('stacks a 36px bordered header, a flex-filling centre and a 36px bordered footer', () => {
    const { container } = render(
      <DocumentStudio kind="document" type="services.service" store={seededStore()} />,
    );
    const root = slot(container, 'document-studio');
    const header = slot(container, 'document-studio-header');
    const center = slot(container, 'document-studio-center');
    const footer = slot(container, 'document-studio-footer');

    expect(root).toHaveClass('flex', 'flex-col');
    expect([...(root?.children ?? [])]).toEqual([header, center, footer]);
    expect(header).toHaveClass('h-9', 'shrink-0', 'border-b', 'border-border');
    expect(center).toHaveClass('flex-1', 'min-h-0');
    expect(footer).toHaveClass('h-9', 'shrink-0', 'border-t', 'border-border');
  });

  it('shows a gray xyflow canvas once kind and type are known', () => {
    const { container } = render(
      <DocumentStudio kind="document" type="services.service" store={seededStore()} />,
    );

    expect(slot(container, 'document-studio-center')?.querySelector('.react-flow')).toHaveClass(
      'bg-gray-10!',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a green "Type: <type>" badge, then a Template badge to its right for a template', () => {
    const { container } = render(
      <DocumentStudio kind="template" type="services.service-agreement" store={seededStore()} />,
    );
    const header = slot(container, 'document-studio-header') as HTMLElement;
    const type = within(header).getByText('Type: Service Agreement');
    const template = within(header).getByText('Template');

    expect(type).toHaveClass('bg-success-surface');
    expect(type.compareDocumentPosition(template) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows no Template badge for a document', () => {
    render(
      <DocumentStudio
        kind="document"
        type="services.service-application-method"
        store={seededStore()}
      />,
    );

    expect(screen.getByText('Type: Application Method')).toBeInTheDocument();
    expect(screen.queryByText('Template')).not.toBeInTheDocument();
  });

  it('asks for the type and kind of a new document, and shows an empty view when dismissed', async () => {
    const user = userEvent.setup();
    const { container } = render(<DocumentStudio store={seededStore()} />);
    const dialog = await screen.findByRole('dialog', { name: 'New document' });

    expect(within(dialog).getAllByRole('radio')).toHaveLength(3);
    expect(
      within(dialog).getByRole('switch', { name: 'This document is a template' }),
    ).not.toBeChecked();
    expect(within(dialog).getByRole('button', { name: 'Create document' })).toBeDisabled();
    const header = slot(container, 'document-studio-header') as HTMLElement;
    expect(header).toBeEmptyDOMElement();

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(slot(container, 'document-studio-empty')).toBeInTheDocument();
    expect(container.querySelector('.react-flow')).not.toBeInTheDocument();
    expect(header).toBeEmptyDOMElement();

    await user.click(screen.getByRole('button', { name: 'New document' }));
    expect(await screen.findByRole('dialog', { name: 'New document' })).toBeInTheDocument();
  });

  it('creates the chosen document, closing the dialog and showing the canvas and badges', async () => {
    const user = userEvent.setup();
    const { container } = render(<DocumentStudio store={seededStore()} />);
    const dialog = await screen.findByRole('dialog', { name: 'New document' });

    await user.click(within(dialog).getByRole('radio', { name: /Application Method/ }));
    await user.click(within(dialog).getByRole('switch', { name: 'This document is a template' }));
    await user.click(within(dialog).getByRole('button', { name: 'Create document' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(container.querySelector('.react-flow')).toBeInTheDocument();
    expect(screen.getByText('Type: Application Method')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
  });

  it('saves a new document from the header, then disables Save until it changes again', async () => {
    const user = userEvent.setup();
    const store = seededStore();
    const onSaved = vi.fn();
    render(
      <DocumentStudio kind="document" type="services.service" store={store} onSaved={onSaved} />,
    );
    const save = screen.getByRole('button', { name: 'Save' });

    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    const { documentId } = onSaved.mock.calls[0]![0];
    expect(await store.load(documentId)).toMatchObject({ type: 'services.service' });
  });

  it('opens an existing document with its own badges, clean, and never asks what to create', async () => {
    const { container } = render(
      <DocumentStudio documentId="stub-agreement-template" store={seededStore()} />,
    );

    expect(screen.getByText('Loading document…')).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector('.react-flow')).toBeInTheDocument());
    expect(screen.getByText('Type: Service Agreement')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says so when the document does not exist', async () => {
    render(<DocumentStudio documentId="missing" store={seededStore()} />);

    expect(await screen.findByText('Document not found.')).toBeInTheDocument();
  });

  it('renders no header controls while a preconfigured type is still missing its kind', async () => {
    const { container } = render(<DocumentStudio type="services.service" store={seededStore()} />);

    expect(await screen.findByRole('dialog', { name: 'New document' })).toBeInTheDocument();
    expect(slot(container, 'document-studio-header')).toBeEmptyDOMElement();
  });

  it('renders no header controls while loading or when the document is not found', async () => {
    const { container } = render(<DocumentStudio documentId="missing" store={seededStore()} />);
    const header = slot(container, 'document-studio-header');

    expect(header).toBeEmptyDOMElement();
    expect(await screen.findByText('Document not found.')).toBeInTheDocument();
    expect(header).toBeEmptyDOMElement();
  });

  it('offers to add a form while the default variant is empty, and adds a Form root', async () => {
    const user = userEvent.setup();
    const store = seededStore();
    const onSaved = vi.fn();
    const { container } = render(
      <DocumentStudio kind="document" type="services.service" store={store} onSaved={onSaved} />,
    );

    expect(slot(container, 'document-studio-form-node')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add a form to get started' }));

    expect(
      screen.queryByRole('button', { name: 'Add a form to get started' }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(slot(container, 'document-studio-form-node')).toHaveTextContent('Untitled form'),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    const { documentId } = onSaved.mock.calls[0]![0];
    expect((await store.load(documentId))?.content.variants).toEqual({
      default: { id: expect.stringMatching(/^[\w-]{8}$/), type: 'Form', elements: [] },
    });
  });

  it("draws an opened document's Form root, with no add button", async () => {
    const { container } = render(
      <DocumentStudio documentId="stub-agreement-template" store={seededStore()} />,
    );

    await waitFor(() =>
      expect(slot(container, 'document-studio-form-node')).toHaveTextContent('Terms of use'),
    );
    expect(
      screen.queryByRole('button', { name: 'Add a form to get started' }),
    ).not.toBeInTheDocument();
  });
});
