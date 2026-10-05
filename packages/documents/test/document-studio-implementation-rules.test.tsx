import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  createDocumentStore,
  DocumentStudio,
  type DocumentKind,
  type StoredDocument,
} from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

const seed = (kind: DocumentKind): StoredDocument[] => [
  {
    id: 'doc',
    kind,
    type: 'services.service-agreement',
    versions: [
      {
        id: 'v1',
        versionNumber: 1,
        content: {
          schema: { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
          variants: {
            default: {
              id: 'F',
              type: 'Form',
              label: 'Terms',
              elements: [{ id: 'cNam', type: 'Control', scope: '#/properties/name' }],
            },
          },
        },
      },
    ],
  },
];

async function open(kind: DocumentKind) {
  const store = createDocumentStore({ seed: seed(kind) });
  const view = render(<DocumentStudio documentId="doc" store={store} />);
  await screen.findByRole('article', { name: 'Terms page' });
  const inspector = () =>
    within(view.container.querySelector<HTMLElement>('[data-slot="document-studio-inspector"]')!);
  return { ...view, store, inspector };
}

describe('DocumentStudio Implementation Rules (doc 258)', () => {
  it('a template shows the section; a rule change enables Save and lands in the Schema view', async () => {
    const user = userEvent.setup();
    const { inspector } = await open('template');
    const section = await waitFor(() =>
      inspector().getByRole('region', { name: 'Implementation Rules' }),
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.click(within(section).getByRole('switch', { name: 'Can add elements' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    await user.click(inspector().getByRole('button', { name: 'JSON' }));
    await waitFor(() =>
      expect(document.querySelector('[data-slot="document-studio-inspector"]')).toHaveTextContent(
        '"capabilities"',
      ),
    );
  });

  it('a document never shows the section', async () => {
    const { inspector } = await open('document');
    await waitFor(() =>
      expect(inspector().getByRole('region', { name: 'General' })).toBeInTheDocument(),
    );
    expect(inspector().queryByRole('region', { name: 'Implementation Rules' })).toBeNull();
  });
});
