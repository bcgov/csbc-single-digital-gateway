import { fireEvent, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { elementName } from '../src/renderers/studio/element-actions';
import { governanceOf } from '../src/studio/capabilities/governance';
import type { DocumentContent } from '../src/studio/document-types';
import { appendTarget } from '../src/studio/palette-insert';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { renderStudioRenderers } from './render-studio-renderers';

const SCHEMA = { type: 'object', properties: { name: { type: 'string', title: 'Name' } } };
const SECTION = {
  id: 'S',
  type: 'Section',
  label: 'About you',
  options: { description: 'Who you are' },
  elements: [{ id: 'n', type: 'Control', scope: '#/properties/name' }],
};
const PAGE = { id: 'F', type: 'Form', label: 'Page', elements: [SECTION] };
const withSection = (section: Record<string, unknown>) => ({ ...PAGE, elements: [section] });

const inSection = (container: HTMLElement, slot: string) =>
  container
    .querySelector('[data-element-id="S"]')!
    .querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;

describe('Section — studio (doc 278 rules 12-13)', () => {
  it('draws the header and its children in a studio vertical grid keyed by the Section', () => {
    const { container } = renderStudioRenderers(PAGE, { schema: SCHEMA });
    expect(inSection(container, 'section-heading')).toHaveTextContent('About you');
    expect(inSection(container, 'section-heading').tagName).toBe('H2');
    expect(inSection(container, 'section-description')).toHaveTextContent('Who you are');
    const grid = inSection(container, 'studio-vertical-layout');
    expect(grid).toContainElement(container.querySelector<HTMLElement>('[data-element-id="n"]'));
  });

  it('draws no header without values — no placeholders — and an empty Section is a drop zone', () => {
    const bare = { id: 'S', type: 'Section', elements: [] };
    const { container } = renderStudioRenderers(withSection(bare), { schema: SCHEMA });
    const section = container.querySelector<HTMLElement>('[data-element-id="S"]')!;
    expect(section.querySelector('[data-slot="section-title"]')).toBeNull();
    expect(section.querySelector('[data-placeholder]')).toBeNull();
    expect(within(section).queryByText('Section title')).toBeNull();
    expect(within(section).getByText('Drag items here')).toBeInTheDocument();
  });

  it('draws only the title, or only the description, when only that has a value', () => {
    const titled = renderStudioRenderers(withSection({ ...SECTION, options: {} }), {
      schema: SCHEMA,
    });
    expect(inSection(titled.container, 'section-heading')).toHaveTextContent('About you');
    expect(
      titled.container.querySelector('[data-element-id="S"] [data-slot="section-description"]'),
    ).toBeNull();
    titled.unmount();
    const described = renderStudioRenderers(withSection({ ...SECTION, label: ' ' }), {
      schema: SCHEMA,
    });
    expect(inSection(described.container, 'section-description')).toHaveTextContent('Who you are');
    expect(
      described.container.querySelector('[data-element-id="S"] [data-slot="section-heading"]'),
    ).toBeNull();
  });

  it('boxes the grid for a container Section, never the header', () => {
    const boxed = { ...SECTION, options: { variant: 'container', inset: 'sm' } };
    const { container } = renderStudioRenderers(withSection(boxed), { schema: SCHEMA });
    const body = inSection(container, 'section-body');
    expect(body).toHaveClass('border', 'bg-gray-20', 'p-2');
    expect(body).toContainElement(inSection(container, 'studio-vertical-layout'));
    expect(body).not.toContainElement(inSection(container, 'section-heading'));
  });

  it('a nested Section heading is one level deeper', () => {
    const inner = { id: 'I', type: 'Section', label: 'Inner', elements: [] };
    const { container } = renderStudioRenderers(withSection({ ...SECTION, elements: [inner] }), {
      schema: SCHEMA,
    });
    const heading = container
      .querySelector('[data-element-id="I"]')!
      .querySelector('[data-slot="section-heading"]')!;
    expect(heading.tagName).toBe('H3');
  });

  it('edits the title in place: Enter commits the trimmed text, blank removes it', () => {
    const { container, update } = renderStudioRenderers(PAGE, { schema: SCHEMA });
    fireEvent.click(inSection(container, 'section-heading'));
    const title = inSection(container, 'section-heading');
    expect(title).toHaveAttribute('contenteditable', 'plaintext-only');
    expect(title).toHaveAccessibleName('Section title');
    title.textContent = '  Your details  ';
    fireEvent.keyDown(title, { key: 'Enter' });
    expect(update).toHaveBeenLastCalledWith('S', { label: 'Your details' });
    fireEvent.click(inSection(container, 'section-heading'));
    inSection(container, 'section-heading').textContent = '';
    fireEvent.blur(inSection(container, 'section-heading'));
    expect(update).toHaveBeenLastCalledWith('S', { label: undefined });
  });

  it('edits the description in place; Escape cancels, Shift+Enter does not commit', () => {
    const { container, update } = renderStudioRenderers(PAGE, { schema: SCHEMA });
    fireEvent.click(inSection(container, 'section-description'));
    const description = inSection(container, 'section-description');
    expect(description).toHaveAccessibleName('Section description');
    description.textContent = 'More';
    fireEvent.keyDown(description, { key: 'Enter', shiftKey: true });
    expect(update).not.toHaveBeenCalled();
    fireEvent.keyDown(description, { key: 'Escape' });
    expect(update).not.toHaveBeenCalled();
    expect(inSection(container, 'section-description')).toHaveTextContent('Who you are');
    fireEvent.click(inSection(container, 'section-description'));
    inSection(container, 'section-description').textContent = '';
    fireEvent.keyDown(inSection(container, 'section-description'), { key: 'Enter' });
    expect(update).toHaveBeenLastCalledWith('S', { options: { description: undefined } });
  });

  it('does not edit a title or description the template locks', () => {
    const content = { schema: SCHEMA, variants: { default: PAGE } } as DocumentContent;
    const governance = governanceOf(content, { elements: { S: { edit: 'none' } } })!;
    const { container } = renderStudioRenderers(PAGE, { schema: SCHEMA, governance });
    fireEvent.click(inSection(container, 'section-heading'));
    fireEvent.click(inSection(container, 'section-description'));
    expect(inSection(container, 'section-heading')).not.toHaveAttribute('contenteditable');
    expect(inSection(container, 'section-description')).not.toHaveAttribute('contenteditable');
  });
});

describe('Section around the studio (doc 278 rules 15-18)', () => {
  it('offers a fresh, option-free Section at the end of the Layout group, after Card', () => {
    const ids = DEFAULT_PALETTE_ITEMS.map((i) => i.id);
    expect(ids.indexOf('section')).toBe(ids.indexOf('card') + 1);
    const item = DEFAULT_PALETTE_ITEMS.find((i) => i.id === 'section')!;
    expect(item).toMatchObject({ label: 'Section', group: 'Layout' });
    const a = item.create();
    const b = item.create();
    expect(a.properties).toBeUndefined();
    expect(a.element).toEqual({ id: expect.any(String), type: 'Section', elements: [] });
    expect(a.element['id']).not.toBe(b.element['id']);
  });

  it('lands a palette click with a Section selected at the end of the Section', () => {
    expect(appendTarget(PAGE, 'S')).toEqual({ layoutId: 'S', index: Infinity });
  });

  it('names an untitled Section "Section"', () => {
    expect(elementName({ type: 'Section' } as never, SCHEMA)).toBe('Section');
    expect(elementName(SECTION as never, SCHEMA)).toBe('About you');
  });

  it('maps a Section’s canvas label and description edits to its own settings', () => {
    const content = { schema: SCHEMA, variants: { default: PAGE } } as DocumentContent;
    const g = governanceOf(content, { elements: { S: { edit: ['sectionTitle'] } } })!;
    expect(g.canPatch('S', { label: 'x' })).toBe(true);
    expect(g.canPatch('S', { options: { description: 'x' } })).toBe(false);
    const d = governanceOf(content, { elements: { S: { edit: ['sectionDescription'] } } })!;
    expect(d.canPatch('S', { options: { description: 'x' } })).toBe(true);
    expect(d.canPatch('S', { label: 'x' })).toBe(false);
  });
});
