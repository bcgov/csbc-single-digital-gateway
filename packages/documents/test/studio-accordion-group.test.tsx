import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, type Mock } from 'vitest';
import { elementName } from '../src/renderers/studio/element-actions';
import type { ElementPatch } from '../src/renderers/studio/index';
import { governanceOf } from '../src/studio/capabilities/governance';
import type { DocumentContent } from '../src/studio/document-types';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { renderStudioRenderers } from './render-studio-renderers';
import { editRichText, richText } from './rich-text-fixtures';

const ITEMS = [
  { id: 'a', title: 'Who can apply?', content: richText('Anyone over 19') },
  { id: 'b', title: '', content: richText('Second answer') },
  { id: 'c', title: '' },
];
const GROUP = {
  id: 'G',
  type: 'AccordionGroup',
  label: 'FAQ',
  options: { description: richText('Read first'), items: ITEMS },
};
const PAGE = { id: 'F', type: 'Form', label: 'Page', elements: [GROUP] };
const withGroup = (group: Record<string, unknown>) => ({ ...PAGE, elements: [group] });

const inGroup = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-element-id="G"]')!;
const slot = (container: HTMLElement, name: string) =>
  inGroup(container).querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
const rows = (container: HTMLElement) => [
  ...inGroup(container).querySelectorAll<HTMLElement>('[data-slot="accordion-item"]'),
];
const lastItems = (update: Mock<(id: string, patch: ElementPatch) => void>) =>
  update.mock.lastCall![1].options!['items'] as { id: string }[];

describe('Accordion group — studio header (doc 279 rules 7, 13)', () => {
  it('draws the title and rich description with their values', () => {
    const { container } = renderStudioRenderers(PAGE);
    expect(slot(container, 'accordion-title')).toHaveTextContent('FAQ');
    expect(slot(container, 'accordion-description')).toHaveTextContent('Read first');
  });

  it('shows grey placeholders for an empty title and description', () => {
    const { container } = renderStudioRenderers(
      withGroup({ id: 'G', type: 'AccordionGroup', options: { items: [] } }),
    );
    expect(slot(container, 'accordion-title')).toHaveTextContent('Accordion title');
    expect(slot(container, 'accordion-title')).toHaveAttribute('data-placeholder');
    expect(slot(container, 'accordion-description')).toHaveTextContent(/^Description$/);
    expect(slot(container, 'accordion-description')).toHaveAttribute('data-placeholder');
  });

  it('edits the title in place: Enter commits trimmed, blank removes the label', () => {
    const { container, update } = renderStudioRenderers(PAGE);
    fireEvent.click(slot(container, 'accordion-title'));
    const title = slot(container, 'accordion-title');
    expect(title).toHaveAccessibleName('Accordion title');
    title.textContent = '  Questions  ';
    fireEvent.keyDown(title, { key: 'Enter' });
    expect(update).toHaveBeenLastCalledWith('G', { label: 'Questions' });
    fireEvent.click(slot(container, 'accordion-title'));
    slot(container, 'accordion-title').textContent = '';
    fireEvent.blur(slot(container, 'accordion-title'));
    expect(update).toHaveBeenLastCalledWith('G', { label: undefined });
  });

  it('edits the description as rich text, writing options.description', async () => {
    const { container, update } = renderStudioRenderers(PAGE);
    fireEvent.click(slot(container, 'accordion-description'));
    const surface = () =>
      slot(container, 'accordion-description').querySelector<HTMLElement>(
        '[contenteditable="true"]',
      )!;
    await waitFor(() => expect(surface()).toHaveFocus());
    editRichText(surface(), richText('Read this first'));
    await waitFor(() => expect(JSON.stringify(update.mock.lastCall)).toContain('Read this first'));
    expect(update.mock.lastCall?.[0]).toBe('G');
    expect(update.mock.lastCall?.[1]).toEqual({
      options: { description: expect.objectContaining({ root: expect.anything() }) },
    });
  });
});

describe('Accordion group — studio items (doc 279 rules 8-11)', () => {
  it('draws every item expanded with its title and body, named Item <n> when untitled', () => {
    const { container } = renderStudioRenderers(PAGE);
    const items = rows(container);
    expect(items).toHaveLength(3);
    expect(items[0]!.querySelector('[data-slot="accordion-item-title"]')).toHaveTextContent(
      'Who can apply?',
    );
    expect(items[0]!.querySelector('[data-slot="accordion-item-content"]')).toHaveTextContent(
      'Anyone over 19',
    );
    expect(items[1]!.querySelector('[data-slot="accordion-item-title"]')).toHaveTextContent(
      'Item title',
    );
    expect(items[1]!.querySelector('[data-slot="accordion-item-title"]')).toHaveAttribute(
      'data-placeholder',
    );
    expect(items[2]!.querySelector('[data-slot="accordion-item-content"]')).toHaveAttribute(
      'data-placeholder',
    );
    expect(within(items[1]!).getByRole('button', { name: 'Delete Item 2' })).toBeInTheDocument();
  });

  it('edits an item title in place, writing the whole list', () => {
    const { container, update } = renderStudioRenderers(PAGE);
    const title = () =>
      rows(container)[1]!.querySelector<HTMLElement>('[data-slot="accordion-item-title"]')!;
    fireEvent.click(title());
    expect(title()).toHaveAccessibleName('Title of Item 2');
    title().textContent = ' Fees ';
    fireEvent.keyDown(title(), { key: 'Enter' });
    const items = lastItems(update);
    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(items[1]).toEqual({ id: 'b', title: 'Fees', content: richText('Second answer') });
  });

  it('edits an item body as rich text', async () => {
    const { container, update } = renderStudioRenderers(PAGE);
    const body = () =>
      rows(container)[0]!.querySelector<HTMLElement>('[data-slot="accordion-item-content"]')!;
    fireEvent.click(body());
    const surface = () => body().querySelector<HTMLElement>('[contenteditable="true"]')!;
    await waitFor(() => expect(surface()).toHaveFocus());
    editRichText(surface(), richText('Anyone over 18'));
    await waitFor(() => expect(JSON.stringify(update.mock.lastCall)).toContain('Anyone over 18'));
    expect(lastItems(update).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('moves items up and down; the ends are disabled', async () => {
    const user = userEvent.setup();
    const { update } = renderStudioRenderers(PAGE);
    expect(screen.getByRole('button', { name: 'Move Who can apply? up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Item 3 down' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move Item 2 up' }));
    expect(lastItems(update).map((i) => i.id)).toEqual(['b', 'a', 'c']);
    await user.click(screen.getByRole('button', { name: 'Move Who can apply? down' }));
    expect(lastItems(update).map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('deletes an empty item at once, and asks first for one with text', async () => {
    const user = userEvent.setup();
    const { update } = renderStudioRenderers(PAGE);
    await user.click(screen.getByRole('button', { name: 'Delete Item 3' }));
    expect(lastItems(update).map((i) => i.id)).toEqual(['a', 'b']);
    update.mockClear();
    await user.click(screen.getByRole('button', { name: 'Delete Who can apply?' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete item?');
    expect(dialog).toHaveTextContent('“Who can apply?” and its content will be removed.');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(update).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete Who can apply?' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    expect(lastItems(update).map((i) => i.id)).toEqual(['b', 'c']);
  });

  it('adds an empty item at the bottom', async () => {
    const user = userEvent.setup();
    const { container, update } = renderStudioRenderers(PAGE);
    const add = screen.getByRole('button', { name: 'Add item' });
    // The add button comes after every item.
    expect(
      rows(container).at(-1)!.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await user.click(add);
    const items = lastItems(update);
    expect(items).toHaveLength(4);
    expect(items[3]).toEqual({ id: expect.stringMatching(/^.{8}$/), title: '' });
    // Rule 10: the new item does not take focus.
    expect(document.activeElement?.closest('[data-slot="accordion-item"]')).toBeFalsy();
  });
});

describe('Accordion group — governed and read-only (doc 279 rules 12-13)', () => {
  const content = { schema: { type: 'object' }, variants: { default: PAGE } } as DocumentContent;

  it('maps canvas edits to its own settings: title, description, items → content', () => {
    const g = governanceOf(content, { elements: { G: { edit: ['accordionTitle'] } } })!;
    expect(g.canPatch('G', { label: 'x' })).toBe(true);
    expect(g.canPatch('G', { options: { description: richText('x') } })).toBe(false);
    expect(g.canPatch('G', { options: { items: [] } })).toBe(false);
    const d = governanceOf(content, { elements: { G: { edit: ['accordionDescription'] } } })!;
    expect(d.canPatch('G', { options: { description: richText('x') } })).toBe(true);
    const c = governanceOf(content, { elements: { G: { edit: ['content'] } } })!;
    expect(c.canPatch('G', { options: { items: [] } })).toBe(true);
    expect(c.canPatch('G', { label: 'x' })).toBe(false);
  });

  it('a template that locks the items hides the item actions and Add item', () => {
    const governance = governanceOf(content, { elements: { G: { edit: ['accordionTitle'] } } })!;
    const { container } = renderStudioRenderers(PAGE, { governance });
    expect(screen.queryByRole('button', { name: 'Add item' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Delete / })).toBeNull();
    const title = rows(container)[0]!.querySelector<HTMLElement>(
      '[data-slot="accordion-item-title"]',
    )!;
    fireEvent.click(title);
    expect(
      rows(container)[0]!.querySelector('[data-slot="accordion-item-title"]'),
    ).not.toHaveAttribute('contenteditable');
  });

  it('without an editor nothing is editable, but placeholders still show', () => {
    const { container } = renderStudioRenderers(
      withGroup({ id: 'G', type: 'AccordionGroup', options: { items: [{ id: 'a', title: '' }] } }),
      { editable: false },
    );
    expect(screen.queryByRole('button', { name: 'Add item' })).toBeNull();
    expect(slot(container, 'accordion-title')).toHaveTextContent('Accordion title');
    fireEvent.click(slot(container, 'accordion-title'));
    expect(slot(container, 'accordion-title')).not.toHaveAttribute('contenteditable');
  });
});

describe('Accordion group around the studio (doc 279 rules 14, 16)', () => {
  it('offers a fresh group with one empty item in the Content group, after Table', () => {
    const ids = DEFAULT_PALETTE_ITEMS.map((i) => i.id);
    expect(ids.indexOf('accordion-group')).toBe(ids.indexOf('table') + 1);
    const item = DEFAULT_PALETTE_ITEMS.find((i) => i.id === 'accordion-group')!;
    expect(item).toMatchObject({ label: 'Accordion group', group: 'Content' });
    const a = item.create();
    const b = item.create();
    expect(a.properties).toBeUndefined();
    expect(a.element).toEqual({
      id: expect.any(String),
      type: 'AccordionGroup',
      options: { items: [{ id: expect.stringMatching(/^.{8}$/), title: '' }] },
    });
    expect(a.element['id']).not.toBe(b.element['id']);
  });

  it('names an untitled group "Accordion group"', () => {
    expect(elementName({ type: 'AccordionGroup' } as never, {})).toBe('Accordion group');
    expect(elementName(GROUP as never, {})).toBe('FAQ');
  });
});
