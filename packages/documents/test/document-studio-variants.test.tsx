import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createDocumentStore, DocumentStudio, type StoredDocument } from '../src/studio';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

const control = (id: string, key: string): Uischema => ({
  id,
  type: 'Control',
  scope: `#/properties/${key}`,
});
const CONTENT: DocumentContent = {
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name' },
      email: { type: 'string', title: 'Email' },
      note: { type: 'string', title: 'Note' },
    },
    required: ['name', 'email'],
  },
  variants: {
    default: {
      id: 'F',
      type: 'Form',
      label: 'Apply',
      elements: [control('dName', 'name'), control('dEmail', 'email'), control('dNote', 'note')],
    },
    Mobile: {
      id: 'M',
      type: 'Form',
      label: 'Apply on the go',
      elements: [
        { id: 'mH', type: 'Heading', options: { text: 'Quick' } },
        control('mName', 'name'),
      ],
    },
  },
};
const doc = (overrides: Partial<StoredDocument> = {}): StoredDocument => ({
  id: 'doc',
  kind: 'document',
  type: 'services.service-application-method',
  versions: [{ id: 'v1', versionNumber: 1, content: CONTENT }],
  ...overrides,
});
const store = (...seed: StoredDocument[]) =>
  createDocumentStore({ seed: seed.length ? seed : [doc()] });

const tabs = () => within(screen.getByRole('tablist', { name: 'Variants' })).getAllByRole('tab');
const tab = (name: string) => screen.getByRole('tab', { name });
const save = () => screen.getByRole('button', { name: 'Save' });
const element = (page: HTMLElement, id: string) =>
  page.querySelector<HTMLElement>(`[data-slot="studio-element"][data-element-id="${id}"]`)!;
const paletteLabels = async () => {
  const palette = (await screen.findAllByRole('region', { name: 'Palette' }))[0]!;
  return [...palette.querySelectorAll('[data-palette-item]')].map((el) => el.textContent);
};

async function open(seeded = store()) {
  const view = render(<DocumentStudio documentId="doc" store={seeded} />);
  await screen.findByRole('article', { name: 'Apply page' });
  return view;
}

async function openMobile() {
  const view = await open();
  fireEvent.click(tab('Mobile'));
  const page = await screen.findByRole('article', { name: 'Apply on the go page' });
  return { ...view, page };
}

describe('DocumentStudio variants (doc 262)', () => {
  it('shows a tab strip with Default first and the other variants in key order', async () => {
    await open();
    expect(tabs().map((t) => t.getAttribute('data-variant-name'))).toEqual(['default', 'Mobile']);
    expect(tab('Default')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Mobile')).toHaveAttribute('aria-selected', 'false');
  });

  it('switching tabs shows that variant on the canvas without dirtying the document', async () => {
    const { page } = await openMobile();
    expect(tab('Mobile')).toHaveAttribute('aria-selected', 'true');
    expect(element(page, 'mH')).not.toBeNull();
    expect(screen.queryByRole('article', { name: 'Apply page' })).toBeNull();
    expect(save()).toBeDisabled();
    fireEvent.click(tab('Default'));
    expect(await screen.findByRole('article', { name: 'Apply page' })).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('switching resets focus and selection', async () => {
    await open();
    const page = screen.getByRole('article', { name: 'Apply page' });
    fireEvent.click(element(page, 'dNote'));
    await waitFor(() => expect(screen.getAllByText('Text').length).toBeGreaterThan(0));
    fireEvent.click(tab('Mobile'));
    await screen.findByRole('article', { name: 'Apply on the go page' });
    // Nothing from the other variant is inspected: the inspector shows the Mobile Form's own settings.
    const settings = screen.getAllByRole('region', { name: 'Inspector' })[0]!;
    await waitFor(() => expect(within(settings).getByText('Form')).toBeInTheDocument());
    expect(within(settings).queryByDisplayValue('Note')).toBeNull();
  });

  it('New variant names, creates and activates a blank Form variant', async () => {
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole('button', { name: 'New variant' }));
    const dialog = await screen.findByRole('dialog', { name: 'New variant' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), '  Print ');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(tab('Print')).toHaveAttribute('aria-selected', 'true'));
    expect(tabs().map((t) => t.getAttribute('data-variant-name'))).toEqual([
      'default',
      'Mobile',
      'Print',
    ]);
    expect(await screen.findByRole('article', { name: /page$/ })).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it('the name dialog shows a problem and disables Create for a taken name', async () => {
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole('button', { name: 'New variant' }));
    const dialog = await screen.findByRole('dialog', { name: 'New variant' });
    expect(within(dialog).getByRole('button', { name: 'Create' })).toBeDisabled();
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'mobile');
    expect(
      within(dialog).getByText('A variant called “mobile” already exists.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('Rename re-keys the variant and keeps it active', async () => {
    const user = userEvent.setup();
    await openMobile();
    await user.click(screen.getByRole('button', { name: 'Mobile variant actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Rename…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rename variant' });
    const input = within(dialog).getByRole('textbox', { name: 'Name' });
    expect(input).toHaveValue('Mobile');
    await user.clear(input);
    await user.type(input, 'Phone');
    await user.click(within(dialog).getByRole('button', { name: 'Rename' }));
    await waitFor(() => expect(tab('Phone')).toHaveAttribute('aria-selected', 'true'));
    expect(tabs().map((t) => t.getAttribute('data-variant-name'))).toEqual(['default', 'Phone']);
    expect(screen.getByRole('article', { name: 'Apply on the go page' })).toBeInTheDocument();
  });

  it('Delete confirms, removes the variant and falls back to Default', async () => {
    const user = userEvent.setup();
    await openMobile();
    await user.click(screen.getByRole('button', { name: 'Mobile variant actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete the “Mobile” variant?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete variant' }));
    await waitFor(() => expect(tabs()).toHaveLength(1));
    expect(tab('Default')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('article', { name: 'Apply page' })).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it('Default has no Rename or Delete', async () => {
    await open();
    expect(screen.queryByRole('button', { name: /variant actions$/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'New variant' })).toBeInTheDocument();
  });

  it('a document governed by a template offers no New, Rename or Delete', async () => {
    const template = doc({
      id: 'tpl',
      kind: 'template',
      versions: [{ id: 'tpl-v1', versionNumber: 1, content: CONTENT }],
    });
    const governed = doc({ template: { templateId: 'tpl', templateVersionId: 'tpl-v1' } });
    await open(store(template, governed));
    await screen.findByText(/^Based on/);
    expect(screen.queryByRole('button', { name: 'New variant' })).toBeNull();
    fireEvent.click(tab('Mobile'));
    await screen.findByRole('article', { name: 'Apply on the go page' });
    expect(screen.queryByRole('button', { name: /variant actions$/ })).toBeNull();
  });

  it('a tab whose variant misses required fields shows a badge naming them', async () => {
    await open();
    expect(tab('Mobile')).toHaveAccessibleDescription('Missing required fields: Email');
    expect(tab('Mobile').querySelector('[data-slot="variant-problems"]')).toHaveTextContent('1');
    expect(tab('Default').querySelector('[data-slot="variant-problems"]')).toBeNull();
  });

  it('outside default the palette lists only unplaced default fields', async () => {
    await openMobile();
    expect(await paletteLabels()).toEqual([
      'Vertical layout',
      'Horizontal layout',
      'Grid',
      'Tabs',
      'Heading',
      'Separator',
      'Rich content',
      'Table',
      'Email',
      'Note',
    ]);
    fireEvent.click(screen.getAllByText('Email').find((el) => el.closest('[data-palette-item]'))!);
    await waitFor(async () => expect(await paletteLabels()).not.toContain('Email'));
    expect(tab('Mobile')).not.toHaveAccessibleDescription();
  });

  it('outside default the inspector shows schema settings disabled with a note', async () => {
    const { page } = await openMobile();
    const name = element(page, 'mName');
    // xyflow measures the page asynchronously: click until the page has selected the field.
    await waitFor(() => {
      fireEvent.click(name);
      expect(name).toHaveAttribute('data-selected');
    });
    const note = await screen.findAllByText(/Edit on the Default variant/);
    const settings = note[0]!.closest('[data-slot="inspector-settings"]') as HTMLElement;
    expect(within(settings).getByRole('switch', { name: 'Required' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(settings).getByRole('textbox', { name: 'Label' })).toBeEnabled();
    expect(within(settings).getByRole('textbox', { name: 'Label' })).toHaveValue('Name');
  });

  it('outside default Copy on a field is disabled with its reason', async () => {
    const { page } = await openMobile();
    const copy = await within(element(page, 'mName')).findByRole('button', { name: 'Copy Name' });
    expect(copy).toBeDisabled();
    expect(copy).toHaveAttribute('title', 'A variant shows each field once');
    expect(within(element(page, 'mH')).getByRole('button', { name: /^Copy/ })).toBeEnabled();
  });

  it('Preview shows the active variant', async () => {
    await openMobile();
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = await screen.findByText('Quick');
    expect(preview.closest('[data-slot="document-preview"]')).not.toBeNull();
    expect(screen.queryByRole('textbox', { name: /Email/ })).toBeNull();
    expect(tab('Mobile')).toHaveAttribute('aria-selected', 'true');
  });
});
