import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createDocumentStore, DocumentStudio, type StoredDocument } from '../src/studio';
import type { DocumentContent } from '../src/studio/document-types';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@repo/ui/sonner', () => ({ toast }));

const CONTENT: DocumentContent = {
  schema: {
    type: 'object',
    properties: { a: { type: 'string', title: 'Name' }, b: { type: 'string', title: 'Email' } },
  },
  variants: {
    default: {
      id: 'F',
      type: 'Form',
      label: 'Terms',
      elements: [
        { id: 'cA', type: 'Control', scope: '#/properties/a' },
        { id: 'cB', type: 'Control', scope: '#/properties/b' },
      ],
    },
  },
};
const TEMPLATE: StoredDocument = {
  id: 'tpl',
  kind: 'template',
  type: 'services.service-agreement',
  versions: [
    {
      id: 'tpl-v1',
      versionNumber: 1,
      content: {
        ...CONTENT,
        capabilities: { elements: { cA: { remove: false }, F: { addChildren: false } } },
      },
    },
  ],
};
const IMPLEMENTATION: StoredDocument = {
  id: 'doc',
  kind: 'document',
  type: 'services.service-agreement',
  template: { templateId: 'tpl', templateVersionId: 'tpl-v1' },
  versions: [{ id: 'doc-v1', versionNumber: 1, content: CONTENT }],
};

const store = () => createDocumentStore({ seed: [TEMPLATE, IMPLEMENTATION] });

/** The same locked Form, holding one layout that still takes children: the Palette stays. */
const withOpenLayout = (doc: StoredDocument, content: DocumentContent): StoredDocument => ({
  ...doc,
  versions: doc.versions.map((version) => ({
    ...version,
    content: {
      ...version.content,
      variants: {
        default: {
          ...content.variants['default'],
          elements: [
            ...(content.variants['default']!['elements'] as unknown[]),
            { id: 'L', type: 'VerticalLayout', elements: [] },
          ],
        },
      },
    },
  })),
});
const openLayoutStore = () =>
  createDocumentStore({
    seed: [withOpenLayout(TEMPLATE, CONTENT), withOpenLayout(IMPLEMENTATION, CONTENT)],
  });
const element = (page: HTMLElement, id: string) =>
  page.querySelector<HTMLElement>(`[data-slot="studio-element"][data-element-id="${id}"]`)!;

describe('a governed document (doc 259 rules 5-13)', () => {
  it('names its template, hides Implementation Rules and locks what the template locks', async () => {
    const { container } = render(<DocumentStudio documentId="doc" store={store()} />);
    const page = await screen.findByRole('article', { name: 'Terms page' });
    expect(await screen.findByText('Based on Terms')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Implementation Rules' })).toBeNull();
    await waitFor(() =>
      expect(
        within(element(page, 'cA')).getByRole('button', { name: 'Delete Name' }),
      ).toBeDisabled(),
    );
    expect(within(element(page, 'cB')).getByRole('button', { name: 'Delete Email' })).toBeEnabled();
    expect(within(element(page, 'cB')).getByRole('button', { name: 'Copy Email' })).toBeDisabled();
    expect(container.querySelector('[data-slot="studio-lock-badge"]')).not.toBeNull();
  });

  it('hides the Palette when nothing on the page may take a new child', async () => {
    const { container } = render(<DocumentStudio documentId="doc" store={store()} />);
    await screen.findByRole('article', { name: 'Terms page' });
    await screen.findByText('Based on Terms');
    expect(container.querySelector('[data-slot="document-studio-palette"]')).toBeNull();
  });

  it('a palette click onto a locked Form inserts nothing and says why (rule 10)', async () => {
    const user = userEvent.setup();
    render(<DocumentStudio documentId="doc" store={openLayoutStore()} />);
    const page = await screen.findByRole('article', { name: 'Terms page' });
    await screen.findByText('Based on Terms');
    const before = page.querySelectorAll('[data-slot="studio-element"]').length;
    await user.click(screen.getByRole('button', { name: /^Text$/ }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith('Locked by the template'));
    expect(page.querySelectorAll('[data-slot="studio-element"]')).toHaveLength(before);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('the template itself stays ungoverned', async () => {
    render(<DocumentStudio documentId="tpl" store={store()} />);
    const page = await screen.findByRole('article', { name: 'Terms page' });
    expect(screen.queryByText(/^Based on/)).toBeNull();
    await waitFor(() =>
      expect(
        within(element(page, 'cA')).getByRole('button', { name: 'Delete Name' }),
      ).toBeEnabled(),
    );
  });
});

describe('creating from a template (doc 259 rules 1-4)', () => {
  it('offers Start from for the type, copies content with ids but not the rules, and pins the version', async () => {
    const user = userEvent.setup();
    const s = store();
    render(<DocumentStudio store={s} />);
    const dialog = await screen.findByRole('dialog', { name: 'New document' });
    expect(within(dialog).queryByRole('radiogroup', { name: 'Start from' })).toBeNull();
    await user.click(within(dialog).getByRole('radio', { name: /Service Agreement/ }));
    const from = await within(dialog).findByRole('radiogroup', { name: 'Start from' });
    expect(within(from).getByRole('radio', { name: 'Blank' })).toBeChecked();
    await user.click(within(dialog).getByRole('switch', { name: 'This document is a template' }));
    expect(within(dialog).queryByRole('radiogroup', { name: 'Start from' })).toBeNull();
    await user.click(within(dialog).getByRole('switch', { name: 'This document is a template' }));
    await user.click(
      within(await within(dialog).findByRole('radiogroup', { name: 'Start from' })).getByRole(
        'radio',
        {
          name: 'Terms',
        },
      ),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Next' }));

    const page = await screen.findByRole('article', { name: 'Terms page' });
    expect(element(page, 'cA')).toBeInTheDocument();
    expect(await screen.findByText('Based on Terms')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(element(page, 'cA')).getByRole('button', { name: 'Delete Name' }),
      ).toBeDisabled(),
    );
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(save).toBeDisabled());
    const all = await s.list({ kind: 'document', type: 'services.service-agreement' });
    const created = all.find((d) => d.id !== 'doc')!;
    const loaded = (await s.load(created.id))!;
    expect(loaded.template).toEqual({ templateId: 'tpl', templateVersionId: 'tpl-v1' });
    expect(loaded.content).not.toHaveProperty('capabilities');
  });
});
