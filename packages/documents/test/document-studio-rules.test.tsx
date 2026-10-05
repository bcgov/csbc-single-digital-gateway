import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createDocumentStore, DocumentStudio, type StoredDocument } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

const RULE = {
  effect: 'SHOW',
  condition: { scope: '#/properties/region', schema: { const: 'north' }, failWhenUndefined: true },
};
const REGION = { id: 'cReg', type: 'Control', scope: '#/properties/region' };
const NAME = { id: 'cNam', type: 'Control', scope: '#/properties/name' };

/** A one-Form document: `elements` on its page, Region a choice and Name a text field. */
const seed = (elements: unknown[]): StoredDocument[] => [
  {
    id: 'doc',
    kind: 'document',
    type: 'services.service-application-method',
    versions: [
      {
        id: 'v1',
        versionNumber: 1,
        content: {
          schema: {
            type: 'object',
            properties: {
              region: {
                type: 'string',
                title: 'Region',
                oneOf: [
                  { const: 'north', title: 'North' },
                  { const: 'coast', title: 'Coast' },
                ],
              },
              name: { type: 'string', title: 'Name' },
            },
          },
          variants: { default: { id: 'F', type: 'Form', label: 'About you', elements } },
        },
      },
    ],
  },
];

async function openPage(elements: unknown[]) {
  const store = createDocumentStore({ seed: seed(elements) });
  const view = render(<DocumentStudio documentId="doc" store={store} />);
  // A root Form is focused at once (doc 233 rule 6).
  const page = await screen.findByRole('article', { name: 'About you page' });
  return { ...view, page };
}

async function select(page: HTMLElement, id: string) {
  const element = page.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
  await waitFor(() => {
    fireEvent.click(element);
    expect(element).toHaveAttribute('data-selected');
  });
  return element;
}

const inspector = (container: HTMLElement) =>
  within(container.querySelector<HTMLElement>('[data-slot="document-studio-inspector"]')!);

describe('DocumentStudio rules (doc 256 rules 9-13)', () => {
  it('shows the rule in the inspector in words, with Edit rule', async () => {
    const { container, page } = await openPage([REGION, { ...NAME, rule: RULE }]);
    await select(page, 'cNam');
    const section = inspector(container).getByRole('region', { name: 'Rule' });
    expect(within(section).getByText('Show when Region equals North')).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Edit rule' })).toBeInTheDocument();
    expect(within(section).queryByRole('alert')).toBeNull();
  });

  it('adds a rule from the action bar, and Preview applies it', async () => {
    const user = userEvent.setup();
    const { page } = await openPage([REGION, NAME]);
    const name = await select(page, 'cNam');
    fireEvent.click(within(name).getByRole('button', { name: 'Rules for Name' }));
    const dialog = within(await screen.findByRole('dialog', { name: /Rule/ }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(name.querySelector('[data-slot="studio-rule-badge"]')).not.toBeNull();
    // Still drawn on the canvas.
    expect(within(name).getByText('Name')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = await waitFor(() => {
      const found = document.querySelector<HTMLElement>('[data-slot="document-preview"]');
      expect(found).not.toBeNull();
      return within(found!);
    });
    // Unanswered, the SHOW rule hides Name; Region, which it tests, is there to answer.
    expect(preview.getByRole('combobox', { name: 'Region' })).toBeInTheDocument();
    expect(preview.queryByRole('textbox', { name: 'Name' })).toBeNull();
  });

  it('flags an element placed above the field its rule tests', async () => {
    const { container, page } = await openPage([{ ...NAME, rule: RULE }, REGION]);
    const name = await select(page, 'cNam');
    expect(name).toHaveAttribute('data-rule-error', '');
    expect(name.querySelector('[data-slot="studio-rule-badge"]')).toHaveAttribute('data-error');
    expect(inspector(container).getByRole('alert')).toHaveTextContent(
      'This rule tests a field that comes after it: Region.',
    );
  });
});
