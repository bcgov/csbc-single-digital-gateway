import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import { referenceItemsSchema } from '../src/renderers/ui/document-reference';
import {
  DocumentReferenceProvider,
  type DocumentReferenceSource,
} from '../src/renderers/ui/reference-source';
import type { DocumentType } from '../src/studio/document-types';

const schema = {
  type: 'object',
  properties: {
    refs: { type: 'array', title: 'Related', items: referenceItemsSchema() },
    table: { type: 'array', title: 'Table', items: referenceItemsSchema() },
  },
};

const control = (options: Record<string, unknown>) => ({
  type: 'Control',
  scope: '#/properties/refs',
  options: { component: 'document-reference', ...options },
});
const typed = (documentType: DocumentType) => control({ documentType });

function fakeSource(overrides: Partial<DocumentReferenceSource> = {}) {
  return {
    candidates: vi.fn<DocumentReferenceSource['candidates']>(async () => [
      {
        id: 's1',
        title: 'Parking',
        description: 'Permits',
        workspaceId: 'w1',
        workspaceName: 'City',
      },
      { id: 's2', title: 'Pets', description: null, workspaceId: 'w2', workspaceName: 'Other' },
    ]),
    templates: vi.fn<DocumentReferenceSource['templates']>(async () => [
      { id: 't1', title: 'Basic form' },
    ]),
    create: vi.fn<DocumentReferenceSource['create']>(async (_type, input) => ({
      id: 'new1',
      title: input.title,
      workspaceId: 'w1',
    })),
    remove: vi.fn<DocumentReferenceSource['remove']>(async () => undefined),
    href: vi.fn((_type: DocumentType, ref: { id: string }) =>
      ref.id === 's1' ? `/app/x/services/${ref.id}` : undefined,
    ),
    ...overrides,
  } satisfies DocumentReferenceSource;
}

function renderControl(
  uischema: Record<string, unknown>,
  data: Record<string, unknown> = {},
  { source, readonly }: { source?: DocumentReferenceSource | null; readonly?: boolean } = {},
) {
  const onChange = vi.fn<(data: Record<string, unknown>) => void>();
  const form = (
    <JsonForms
      schema={schema}
      uischema={uischema as never}
      data={data}
      renderers={defaults.renderers}
      cells={defaults.cells}
      onChange={({ data: next }) => onChange(next as Record<string, unknown>)}
      {...(readonly === true && { readonly: true })}
    />
  );
  const view = render(
    source === null || source === undefined ? (
      form
    ) : (
      <DocumentReferenceProvider value={source}>{form}</DocumentReferenceProvider>
    ),
  );
  const lastData = () => onChange.mock.calls.at(-1)?.[0];
  const field = () => view.container.querySelector<HTMLElement>('[data-slot="document-reference"]');
  return { ...view, lastData, field };
}

const button = (name: RegExp | string) => screen.queryByRole('button', { name });

describe('DocumentReferenceControl', () => {
  describe('dispatch', () => {
    it('wins over the data table for an object array with component document-reference', () => {
      const { container } = renderControl(typed('services.service'));
      expect(container.querySelector('[data-component="document-reference"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="document-reference"]')).toHaveAttribute(
        'data-document-type',
        'services.service',
      );
      expect(container.querySelector('table')).toBeNull();
    });

    it('shows Choose a document type when documentType is missing, with no actions', () => {
      renderControl(control({}), {}, { source: fakeSource() });
      expect(screen.getByText(/Choose a document type/)).toBeInTheDocument();
      expect(button(/Add existing/)).toBeNull();
      expect(button(/Create new/)).toBeNull();
    });
  });

  describe('policy', () => {
    it('offers Add existing only for services.service', () => {
      renderControl(typed('services.service'), {}, { source: fakeSource() });
      expect(button(/Add existing/)).toBeEnabled();
      expect(button(/Create new/)).toBeNull();
    });

    it('offers Create new only for services.service-application-method', () => {
      renderControl(typed('services.service-application-method'), {}, { source: fakeSource() });
      expect(button(/Add existing/)).toBeNull();
      expect(button('Create new application method')).toBeEnabled();
    });

    it('offers Add existing and Create new for services.service-agreement', () => {
      renderControl(typed('services.service-agreement'), {}, { source: fakeSource() });
      expect(button(/Add existing/)).toBeEnabled();
      expect(button('Create new service agreement')).toBeEnabled();
    });
  });

  describe('grid', () => {
    it('renders each stored reference as a card with title, description and a link when href returns one', () => {
      const { container } = renderControl(
        typed('services.service'),
        {
          refs: [
            { id: 's1', title: 'Parking', description: 'Permits' },
            { id: 's9', title: 'Elsewhere' },
          ],
        },
        { source: fakeSource() },
      );
      const cards = container.querySelectorAll('[data-slot="reference-card"]');
      expect(cards).toHaveLength(2);
      expect(
        within(cards[0] as HTMLElement).getByRole('link', { name: /Parking/ }),
      ).toHaveAttribute('href', '/app/x/services/s1');
      expect(within(cards[0] as HTMLElement).getByText('Permits')).toBeInTheDocument();
      expect(within(cards[1] as HTMLElement).queryByRole('link')).toBeNull();
      expect(within(cards[1] as HTMLElement).getByText('Elsewhere')).toBeInTheDocument();
    });

    it('renders Untitled for a reference without a title', () => {
      const { container } = renderControl(typed('services.service'), { refs: [{ id: 'x' }] });
      expect(container.querySelector('[data-slot="reference-card"]')).toHaveTextContent('Untitled');
    });
  });

  describe('pick', () => {
    it('searches candidates with the typed query after the debounce and lists title, description and workspace', async () => {
      const user = userEvent.setup();
      const source = fakeSource();
      renderControl(typed('services.service'), {}, { source });
      await user.click(button(/Add existing/)!);
      const dialog = await screen.findByRole('dialog');
      expect(await within(dialog).findByText('Parking')).toBeInTheDocument();
      expect(within(dialog).getByText('Permits')).toBeInTheDocument();
      expect(within(dialog).getByText('City')).toBeInTheDocument();
      expect(source.candidates).toHaveBeenLastCalledWith('services.service', { q: '' });
      await user.type(within(dialog).getByRole('searchbox'), 'park');
      await waitFor(() =>
        expect(source.candidates).toHaveBeenLastCalledWith('services.service', { q: 'park' }),
      );
      // Debounced: not once per keystroke.
      expect(vi.mocked(source.candidates).mock.calls.length).toBeLessThan(5);
    });

    it('shows already-referenced ids checked and disabled and appends only the newly selected ones', async () => {
      const user = userEvent.setup();
      const { lastData } = renderControl(
        typed('services.service'),
        { refs: [{ id: 's1', title: 'Parking' }] },
        { source: fakeSource() },
      );
      await user.click(button(/Add existing/)!);
      const dialog = await screen.findByRole('dialog');
      await within(dialog).findByText('Pets');
      const boxes = within(dialog).getAllByRole('checkbox');
      expect(boxes[0]).toHaveAttribute('aria-checked', 'true');
      expect(boxes[0]).toHaveAttribute('aria-disabled', 'true');
      await user.click(within(dialog).getByText('Pets'));
      await user.click(within(dialog).getByRole('button', { name: 'Add (1)' }));
      await waitFor(() =>
        expect(lastData()?.['refs']).toEqual([
          { id: 's1', title: 'Parking' },
          { id: 's2', title: 'Pets', workspaceId: 'w2' },
        ]),
      );
    });

    it('shows No documents found for an empty result and an error message when candidates rejects', async () => {
      const user = userEvent.setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const empty = renderControl(
        typed('services.service'),
        {},
        { source: fakeSource({ candidates: async () => [] }) },
      );
      await user.click(button(/Add existing/)!);
      expect(await screen.findByText('No documents found')).toBeInTheDocument();
      empty.unmount();
      renderControl(
        typed('services.service'),
        {},
        { source: fakeSource({ candidates: async () => Promise.reject(new Error('down')) }) },
      );
      await user.click(button(/Add existing/)!);
      expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn.t load documents/);
      expect(error).toHaveBeenCalled();
      error.mockRestore();
    });
  });

  describe('create', () => {
    it('lists templates of the type and preselects the only one', async () => {
      const user = userEvent.setup();
      const source = fakeSource();
      renderControl(typed('services.service-application-method'), {}, { source });
      await user.click(button(/Create new/)!);
      const dialog = await screen.findByRole('dialog');
      const radio = await within(dialog).findByRole('radio', { name: 'Basic form' });
      expect(radio).toHaveAttribute('aria-checked', 'true');
      expect(source.templates).toHaveBeenCalledWith('services.service-application-method');
    });

    it('disables Create with No published template when there are no templates', async () => {
      const user = userEvent.setup();
      renderControl(
        typed('services.service-agreement'),
        {},
        { source: fakeSource({ templates: async () => [] }) },
      );
      await user.click(button(/Create new/)!);
      const dialog = await screen.findByRole('dialog');
      expect(
        await within(dialog).findByText('No published template for Service Agreement'),
      ).toBeInTheDocument();
      await user.type(within(dialog).getByLabelText('Title'), 'Terms');
      expect(within(dialog).getByRole('button', { name: 'Create' })).toBeDisabled();
    });

    it('requires a trimmed title, calls create(type, {title, templateId}) and appends the returned reference', async () => {
      const user = userEvent.setup();
      const source = fakeSource();
      const { lastData } = renderControl(
        typed('services.service-application-method'),
        {},
        { source },
      );
      await user.click(button(/Create new/)!);
      const dialog = await screen.findByRole('dialog');
      await within(dialog).findByRole('radio', { name: 'Basic form' });
      const create = within(dialog).getByRole('button', { name: 'Create' });
      await user.type(within(dialog).getByLabelText('Title'), '   ');
      expect(create).toBeDisabled();
      await user.type(within(dialog).getByLabelText('Title'), 'Online form ');
      await user.click(create);
      await waitFor(() =>
        expect(source.create).toHaveBeenCalledWith('services.service-application-method', {
          title: 'Online form',
          templateId: 't1',
        }),
      );
      await waitFor(() =>
        expect(lastData()?.['refs']).toEqual([
          { id: 'new1', title: 'Online form', workspaceId: 'w1' },
        ]),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('keeps the dialog open with the error and appends nothing when create rejects', async () => {
      const user = userEvent.setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { lastData } = renderControl(
        typed('services.service-agreement'),
        {},
        { source: fakeSource({ create: async () => Promise.reject(new Error('Template gone')) }) },
      );
      await user.click(button(/Create new/)!);
      const dialog = await screen.findByRole('dialog');
      await within(dialog).findByRole('radio', { name: 'Basic form' });
      await user.type(within(dialog).getByLabelText('Title'), 'Terms');
      await user.click(within(dialog).getByRole('button', { name: 'Create' }));
      expect(await within(dialog).findByText('Template gone')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(lastData()?.['refs']).toBeUndefined();
      expect(error).toHaveBeenCalled();
      error.mockRestore();
    });
  });

  describe('remove', () => {
    it('drops a picked reference immediately without calling source.remove', async () => {
      const user = userEvent.setup();
      const source = fakeSource();
      const { lastData } = renderControl(
        typed('services.service'),
        { refs: [{ id: 's1', title: 'Parking' }] },
        { source },
      );
      await user.click(button('Remove Parking')!);
      await waitFor(() => expect(lastData()).not.toHaveProperty('refs'));
      expect(source.remove).not.toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('confirms then calls source.remove and drops an application method reference', async () => {
      const user = userEvent.setup();
      const source = fakeSource();
      const { lastData } = renderControl(
        typed('services.service-application-method'),
        {
          refs: [
            { id: 'm1', title: 'Online form' },
            { id: 'm2', title: 'Paper' },
          ],
        },
        { source },
      );
      await user.click(button('Remove Online form')!);
      const confirm = await screen.findByRole('alertdialog');
      expect(confirm).toHaveTextContent('Delete Online form?');
      expect(confirm).toHaveTextContent('This deletes the application method document.');
      expect(source.remove).not.toHaveBeenCalled();
      await user.click(within(confirm).getByRole('button', { name: 'Delete' }));
      await waitFor(() =>
        expect(source.remove).toHaveBeenCalledWith('services.service-application-method', 'm1'),
      );
      await waitFor(() => expect(lastData()?.['refs']).toEqual([{ id: 'm2', title: 'Paper' }]));
    });

    it('keeps the reference and shows the error when source.remove rejects', async () => {
      const user = userEvent.setup();
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { lastData } = renderControl(
        typed('services.service-application-method'),
        { refs: [{ id: 'm1', title: 'Online form' }] },
        {
          source: fakeSource({
            remove: async () => Promise.reject(new Error('Form has submissions')),
          }),
        },
      );
      await user.click(button('Remove Online form')!);
      const confirm = await screen.findByRole('alertdialog');
      await user.click(within(confirm).getByRole('button', { name: 'Delete' }));
      expect(await within(confirm).findByRole('alert')).toHaveTextContent('Form has submissions');
      expect(lastData()?.['refs']).toEqual([{ id: 'm1', title: 'Online form' }]);
      expect(error).toHaveBeenCalled();
      error.mockRestore();
    });
  });

  describe('no source', () => {
    it('lists stored references and disables actions with Available when filling a document', () => {
      const { container } = renderControl(typed('services.service-agreement'), {
        refs: [{ id: 'a1', title: 'Terms' }],
      });
      expect(container.querySelectorAll('[data-slot="reference-card"]')).toHaveLength(1);
      expect(button(/Add existing/)).toBeDisabled();
      expect(button(/Create new/)).toBeDisabled();
      expect(screen.getByText('Available when filling a document')).toBeInTheDocument();
    });
  });

  describe('disabled', () => {
    it('renders no action or remove buttons when the control is disabled', () => {
      const { container } = renderControl(
        typed('services.service-agreement'),
        { refs: [{ id: 'a1', title: 'Terms' }] },
        { source: fakeSource(), readonly: true },
      );
      expect(container.querySelectorAll('[data-slot="reference-card"]')).toHaveLength(1);
      expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
  });
});
