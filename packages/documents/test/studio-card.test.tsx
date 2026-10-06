import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { elementName } from '../src/renderers/studio/element-actions';
import { governanceOf } from '../src/studio/capabilities/governance';
import type { DocumentContent } from '../src/studio/document-types';
import { removeElement } from '../src/studio/element-remove';
import { appendTarget } from '../src/studio/palette-insert';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { renderStudioRenderers } from './render-studio-renderers';

const SCHEMA = { type: 'object', properties: { name: { type: 'string', title: 'Name' } } };
const CARD = {
  id: 'C',
  type: 'Card',
  label: 'Contact',
  options: { description: 'How to reach you' },
  elements: [
    {
      id: 'c',
      type: 'VerticalLayout',
      elements: [{ id: 'n', type: 'Control', scope: '#/properties/name' }],
    },
    { id: 'f', type: 'VerticalLayout', elements: [] },
  ],
};
const PAGE = { id: 'F', type: 'Form', label: 'Page', elements: [CARD] };
const withCard = (card: Record<string, unknown>) => ({ ...PAGE, elements: [card] });

const inCard = (container: HTMLElement, slot: string) =>
  container
    .querySelector('[data-element-id="C"]')!
    .querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;

describe('Card — studio (doc 273 rules 5-7)', () => {
  it('draws the header and both slots as studio vertical layouts', () => {
    const { container } = renderStudioRenderers(PAGE, { schema: SCHEMA });
    expect(inCard(container, 'card-title')).toHaveTextContent('Contact');
    expect(inCard(container, 'card-description')).toHaveTextContent('How to reach you');
    const content = container.querySelector('[data-element-id="c"]')!;
    const footer = container.querySelector('[data-element-id="f"]')!;
    expect(content).toHaveAttribute('data-element-type', 'VerticalLayout');
    expect(inCard(container, 'card-content')).toContainElement(content as HTMLElement);
    expect(inCard(container, 'card-footer')).toContainElement(footer as HTMLElement);
    // Doc 273 B1: the Card holds a drag between its slots, and each slot's grid has a floor height.
    expect(
      container.querySelector('[data-element-id="C"] > [data-slot="studio-card"]'),
    ).not.toBeNull();
    expect(content.parentElement).toHaveAttribute('data-slot', 'card-slot');
    expect(footer.parentElement).toHaveAttribute('data-slot', 'card-slot');
    // The empty footer is a drop zone in the studio.
    expect(within(footer as HTMLElement).getByText('Drag items here')).toBeInTheDocument();
  });

  it('shows grey placeholders for an empty title and description, and no footer when absent', () => {
    const bare = { id: 'C', type: 'Card', elements: [CARD.elements[0]] };
    const { container } = renderStudioRenderers(withCard(bare), { schema: SCHEMA });
    expect(inCard(container, 'card-title')).toHaveTextContent('Card title');
    expect(inCard(container, 'card-title')).toHaveAttribute('data-placeholder');
    expect(inCard(container, 'card-description')).toHaveTextContent('Description');
    expect(inCard(container, 'card-description')).toHaveAttribute('data-placeholder');
    expect(container.querySelector('[data-slot="card-footer"]')).toBeNull();
  });

  it('edits the title in place: Enter commits the trimmed text, blank removes it', () => {
    const { container, update } = renderStudioRenderers(PAGE, { schema: SCHEMA });
    fireEvent.click(inCard(container, 'card-title'));
    const title = inCard(container, 'card-title');
    expect(title).toHaveAttribute('contenteditable', 'plaintext-only');
    expect(title).toHaveAccessibleName('Card title');
    title.textContent = '  Reach us  ';
    fireEvent.keyDown(title, { key: 'Enter' });
    expect(update).toHaveBeenLastCalledWith('C', { label: 'Reach us' });
    fireEvent.click(inCard(container, 'card-title'));
    inCard(container, 'card-title').textContent = '';
    fireEvent.blur(inCard(container, 'card-title'));
    expect(update).toHaveBeenLastCalledWith('C', { label: undefined });
  });

  it('edits the description in place; Escape cancels, Shift+Enter does not commit', () => {
    const { container, update } = renderStudioRenderers(PAGE, { schema: SCHEMA });
    fireEvent.click(inCard(container, 'card-description'));
    const description = inCard(container, 'card-description');
    expect(description).toHaveAccessibleName('Card description');
    description.textContent = 'Call us';
    fireEvent.keyDown(description, { key: 'Enter', shiftKey: true });
    expect(update).not.toHaveBeenCalled();
    fireEvent.keyDown(description, { key: 'Escape' });
    expect(update).not.toHaveBeenCalled();
    expect(inCard(container, 'card-description')).toHaveTextContent('How to reach you');
    fireEvent.click(inCard(container, 'card-description'));
    inCard(container, 'card-description').textContent = 'Call us';
    fireEvent.keyDown(inCard(container, 'card-description'), { key: 'Enter' });
    expect(update).toHaveBeenLastCalledWith('C', { options: { description: 'Call us' } });
  });

  it('does not edit a title or description the template locks', () => {
    const content = { schema: SCHEMA, variants: { default: PAGE } } as DocumentContent;
    const governance = governanceOf(content, { elements: { C: { edit: 'none' } } })!;
    const { container } = renderStudioRenderers(PAGE, { schema: SCHEMA, governance });
    fireEvent.click(inCard(container, 'card-title'));
    fireEvent.click(inCard(container, 'card-description'));
    expect(inCard(container, 'card-title')).not.toHaveAttribute('contenteditable');
    expect(inCard(container, 'card-description')).not.toHaveAttribute('contenteditable');
  });

  it('withholds Copy from both slots and Delete from the content slot; the footer deletes', () => {
    const { remove } = renderStudioRenderers(PAGE, {
      schema: SCHEMA,
      removable: true,
      copyable: true,
    });
    const buttons = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(buttons).toContain('Copy Contact');
    expect(buttons).toContain('Delete Contact');
    expect(buttons.filter((b) => b === 'Copy Vertical layout')).toEqual([]);
    expect(buttons.filter((b) => b === 'Delete Vertical layout')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Vertical layout' }));
    expect(remove).toHaveBeenCalledWith('f', 'Vertical layout');
    // An element inside a slot keeps its own actions.
    expect(buttons).toContain('Copy Name');
  });
});

describe('Card around the studio (doc 273 rules 7, 11-13)', () => {
  it('never removes the content slot', () => {
    const content = { schema: SCHEMA, variants: { default: PAGE } } as DocumentContent;
    expect(removeElement(content, 'c')).toBe(content);
    const without = removeElement(content, 'f');
    expect((without.variants['default'] as typeof PAGE).elements[0]!.elements).toHaveLength(1);
  });

  it('offers a fresh Card in the Layout group: content only, no schema properties', () => {
    const item = DEFAULT_PALETTE_ITEMS.find((i) => i.id === 'card')!;
    expect(item).toMatchObject({ label: 'Card', group: 'Layout' });
    const a = item.create();
    const b = item.create();
    expect(a.properties).toBeUndefined();
    expect(a.element).toMatchObject({
      type: 'Card',
      elements: [{ type: 'VerticalLayout', elements: [] }],
    });
    expect((a.element['elements'] as unknown[]).length).toBe(1);
    expect(a.element['id']).not.toBe(b.element['id']);
  });

  it('lands a palette click with a Card selected in its content slot', () => {
    expect(appendTarget(PAGE, 'C')).toEqual({ layoutId: 'c', index: Infinity });
    expect(appendTarget(PAGE, 'f')).toEqual({ layoutId: 'f', index: Infinity });
  });

  it('names an untitled Card "Card"', () => {
    expect(elementName({ type: 'Card' } as never, SCHEMA)).toBe('Card');
    expect(elementName(CARD as never, SCHEMA)).toBe('Contact');
  });

  it('maps a Card’s canvas label and description edits to its own settings', () => {
    const content = { schema: SCHEMA, variants: { default: PAGE } } as DocumentContent;
    const g = governanceOf(content, {
      elements: { C: { edit: ['cardTitle'] } },
    })!;
    expect(g.canPatch('C', { label: 'x' })).toBe(true);
    expect(g.canPatch('C', { options: { description: 'x' } })).toBe(false);
    const d = governanceOf(content, { elements: { C: { edit: ['cardDescription'] } } })!;
    expect(d.canPatch('C', { options: { description: 'x' } })).toBe(true);
    expect(d.canPatch('C', { label: 'x' })).toBe(false);
  });
});
