import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DocumentStudio, type DocumentStore } from '../src/studio';
import type { DocumentContent } from '../src/studio/document-types';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

/** A Form root with one field; the field has no `id`, so the studio stamps one. */
const CONTENT: DocumentContent = {
  schema: { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
  variants: {
    default: {
      id: 'F',
      type: 'Form',
      label: 'Terms',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    },
  },
};

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

/** A store that fails the test if the studio ever touches it. */
const throwingStore = (): DocumentStore => ({
  load: vi.fn(() => Promise.reject(new Error('load'))),
  create: vi.fn(() => Promise.reject(new Error('create'))),
  list: vi.fn(() => Promise.reject(new Error('list'))),
  save: vi.fn(() => Promise.reject(new Error('save'))),
});

describe('DocumentStudio — host-controlled mode (doc 276)', () => {
  it('opens the given content with no store, no New Document dialog and no Save', async () => {
    const store = throwingStore();
    render(
      <DocumentStudio
        content={CONTENT}
        kind="template"
        type="services.service-agreement"
        store={store}
      />,
    );
    expect(await screen.findByRole('article', { name: 'Terms page' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(slot('document-studio-template')).toHaveTextContent('Template');
    for (const method of Object.values(store)) expect(method).not.toHaveBeenCalled();
  });

  it('emits the opened content once on mount, with missing ids stamped, then every edit', async () => {
    const onContentChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentStudio
        content={CONTENT}
        kind="template"
        type="services.service-agreement"
        onContentChange={onContentChange}
      />,
    );
    await screen.findByRole('article', { name: 'Terms page' });
    expect(onContentChange).toHaveBeenCalledTimes(1);
    const baseline = onContentChange.mock.calls[0]![0] as DocumentContent;
    const [field] = baseline.variants.default['elements'] as Record<string, unknown>[];
    expect(field!['id']).toMatch(/^[\w-]{8}$/);
    // The host's own object is never mutated.
    expect(CONTENT.variants.default['elements']).toEqual([
      { type: 'Control', scope: '#/properties/name' },
    ]);
    // An edit: add a variant from the tab strip.
    await user.click(screen.getByRole('button', { name: 'New variant' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), 'Mobile');
    await user.click(within(dialog).getByRole('button', { name: /create|add/i }));
    await waitFor(() => expect(onContentChange).toHaveBeenCalledTimes(2));
    expect(Object.keys((onContentChange.mock.calls[1]![0] as DocumentContent).variants)).toEqual([
      'default',
      'Mobile',
    ]);
  });

  it('locks a read-only studio to Preview: no Edit toggle, no variant management', async () => {
    render(
      <DocumentStudio
        content={CONTENT}
        kind="template"
        type="services.service-agreement"
        readOnly
      />,
    );
    expect(await screen.findByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(slot('document-preview')).not.toBeNull();
    expect(slot('document-studio-mode')).toBeNull();
    expect(slot('variant-new')).toBeNull();
    expect(document.querySelector('.react-flow')).toBeNull();
  });

  it('shows the governing template and offers no variant management on a governed document', async () => {
    render(
      <DocumentStudio
        content={CONTENT}
        kind="document"
        type="services.service-agreement"
        governing={{ name: 'Standard terms', capabilities: { default: {} } }}
      />,
    );
    await screen.findByRole('article', { name: 'Terms page' });
    expect(slot('document-studio-based-on')).toHaveTextContent('Based on Standard terms');
    expect(slot('variant-new')).toBeNull();
  });
});
