import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { referenceItemsSchema } from '../src/renderers/ui/document-reference';
import type { DocumentReferenceSource } from '../src/renderers/ui/reference-source';
import { DocumentStudio } from '../src/studio';
import type { DocumentContent } from '../src/studio/document-types';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { variantPalette } from '../src/studio/variants/variant-fields';
import { DocumentView } from '../src/view';
import { renderStudioRenderers } from './render-studio-renderers';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

const SCHEMA = {
  type: 'object',
  properties: { refs: { type: 'array', title: 'Related services', items: referenceItemsSchema() } },
};
const CONTROL = {
  id: 'r',
  type: 'Control',
  scope: '#/properties/refs',
  options: { component: 'document-reference', documentType: 'services.service' },
};
const PAGE = { id: 'F', type: 'Form', label: 'Permit', elements: [CONTROL] };
const CONTENT: DocumentContent = { schema: SCHEMA, variants: { default: PAGE } };

function source(): DocumentReferenceSource {
  return {
    candidates: vi.fn(async () => [{ id: 's1', title: 'Parking', workspaceId: 'w1' }]),
    templates: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: 'x' })),
    remove: vi.fn(async () => undefined),
    href: (_type, ref) => `/services/${ref.id}`,
  };
}

/** Pick Parking through the canvas control's Add existing dialog. */
async function pickParking() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /Add existing/ }));
  const dialog = await screen.findByRole('dialog');
  await user.click(await within(dialog).findByText('Parking'));
  await user.click(within(dialog).getByRole('button', { name: 'Add (1)' }));
}

describe('studio document reference', () => {
  describe('canvas', () => {
    it('outranks the inert ui entry and draws an inert preview when the studio is not fillable', () => {
      const { container } = renderStudioRenderers(PAGE, { schema: SCHEMA });
      const element = container.querySelector<HTMLElement>('[data-element-id="r"]')!;
      expect(element.querySelector('[data-slot="document-reference"]')).not.toBeNull();
      expect(element.querySelector('[data-slot="studio-element-body"]')).toHaveAttribute('inert');
      expect(element.querySelector('table')).toBeNull();
      // No host on an authoring canvas: the action is shown, disabled.
      expect(within(element).getByRole('button', { name: /Add existing/ })).toBeDisabled();
    });

    it('is live in a fillable studio and writes references to the studio answers', async () => {
      const onContentChange = vi.fn<(content: DocumentContent) => void>();
      render(
        <DocumentStudio
          content={CONTENT}
          kind="document"
          type="services.service"
          fillable
          references={source()}
          onContentChange={onContentChange}
        />,
      );
      await pickParking();
      await waitFor(() =>
        expect(onContentChange.mock.calls.at(-1)?.[0].data).toEqual({
          refs: [{ id: 's1', title: 'Parking', workspaceId: 'w1' }],
        }),
      );
    });
  });

  describe('palette', () => {
    it('offers a Document reference item creating the fixed item schema and documentType services.service', () => {
      const item = DEFAULT_PALETTE_ITEMS.find(
        (candidate) => candidate.id === 'document-reference',
      )!;
      expect(item).toMatchObject({ label: 'Document reference', group: 'Record fields' });
      const { element, properties } = item.create();
      const [key] = Object.keys(properties!);
      expect(properties![key!]).toEqual({
        type: 'array',
        title: 'Untitled references',
        items: referenceItemsSchema(),
      });
      expect(element).toMatchObject({
        type: 'Control',
        scope: `#/properties/${key}`,
        options: { component: 'document-reference', documentType: 'services.service' },
      });
      expect(Object.keys(item.create().properties!)[0]).not.toBe(key);
    });

    it('withholds the Document reference item outside the default variant', () => {
      const content: DocumentContent = { ...CONTENT, variants: { default: PAGE, Mobile: {} } };
      const ids = (variant: string) =>
        variantPalette(DEFAULT_PALETTE_ITEMS, content, variant).map((item) => item.id);
      expect(ids('default')).toContain('document-reference');
      expect(ids('Mobile')).not.toContain('document-reference');
    });
  });

  describe('view', () => {
    it('DocumentView lists each reference title (linked via href) and description', () => {
      render(
        <DocumentView
          schema={SCHEMA}
          uischema={PAGE}
          data={{ refs: [{ id: 's1', title: 'Parking', description: 'Permits' }, { id: 's2' }] }}
          references={source()}
        />,
      );
      const list = document.querySelector<HTMLElement>('[data-slot="plain-document-references"]')!;
      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(within(items[0]!).getByRole('link', { name: /Parking/ })).toHaveAttribute(
        'href',
        '/services/s1',
      );
      expect(within(items[0]!).getByText('Permits')).toBeInTheDocument();
      expect(items[1]).toHaveTextContent('Untitled');
      expect(within(list).queryByRole('button')).toBeNull();
    });

    it('DocumentView shows Not answered for a document reference with no references', () => {
      render(<DocumentView schema={SCHEMA} uischema={PAGE} data={{}} />);
      const field = document.querySelector('[data-component="document-reference"]');
      expect(field).toHaveTextContent('Not answered');
      expect(document.querySelector('[data-slot="plain-document-references"]')).toBeNull();
    });
  });

  describe('host', () => {
    it('DocumentStudio passes its references prop to the control through the provider', async () => {
      const host = source();
      render(
        <DocumentStudio
          content={CONTENT}
          kind="document"
          type="services.service"
          fillable
          references={host}
        />,
      );
      await pickParking();
      expect(host.candidates).toHaveBeenCalledWith('services.service', { q: '' });
    });
  });
});
