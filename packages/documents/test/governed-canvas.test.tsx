import { fireEvent, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { governanceOf } from '../src/studio/capabilities/governance';
import type { CapabilityMap } from '../src/studio/capabilities/capability-types';
import type { DocumentContent } from '../src/studio/document-types';
import { renderStudioRenderers, studioHeading } from './render-studio-renderers';

const SCHEMA = {
  type: 'object',
  properties: { a: { type: 'string', title: 'A' }, b: { type: 'string', title: 'B' } },
};
const PAGE = {
  id: 'F',
  type: 'Form',
  label: 'Page',
  elements: [
    { id: 'c-a', type: 'Control', scope: '#/properties/a' },
    studioHeading('h', 'Intro'),
    {
      id: 'L',
      type: 'VerticalLayout',
      elements: [{ id: 'c-b', type: 'Control', scope: '#/properties/b' }],
    },
  ],
};
const MAP: CapabilityMap = {
  elements: {
    'c-a': { remove: false, move: false },
    h: { edit: 'none' },
    L: { addChildren: false },
    F: { edit: 'none' },
  },
};
const governed = (map: CapabilityMap = MAP) =>
  governanceOf({ schema: SCHEMA, variants: { default: PAGE } } as DocumentContent, map)!;
const render = (map?: CapabilityMap) =>
  renderStudioRenderers(PAGE, {
    schema: SCHEMA,
    removable: true,
    copyable: true,
    governance: governed(map),
  });
const element = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`[data-slot="studio-element"][data-element-id="${id}"]`)!;

describe('governed canvas (doc 259 rules 8-14)', () => {
  it('Delete is shown but disabled and explained where removal is locked', () => {
    const { container, remove } = render();
    const del = within(element(container, 'c-a')).getByRole('button', { name: 'Delete A' });
    expect(del).toBeDisabled();
    expect(del).toHaveAttribute('title', 'Locked by the template');
    fireEvent.click(del);
    expect(remove).not.toHaveBeenCalled();
    expect(within(element(container, 'h')).getByRole('button', { name: /^Delete/ })).toBeEnabled();
  });

  it('Copy is disabled inside a container that may not add', () => {
    const { container, copy } = render();
    const button = within(element(container, 'c-b')).getByRole('button', { name: 'Copy B' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(copy).not.toHaveBeenCalled();
    expect(within(element(container, 'c-a')).getByRole('button', { name: 'Copy A' })).toBeEnabled();
  });

  it('a restricted element shows a lock badge naming its restrictions (rule 9)', () => {
    const { container } = render();
    const badge = element(container, 'c-a').querySelector('[data-slot="studio-lock-badge"]');
    expect(badge).toHaveAttribute(
      'title',
      "Locked by the template: can't be deleted, can't be moved",
    );
    expect(element(container, 'c-b').querySelector('[data-slot="studio-lock-badge"]')).toBeNull();
  });

  it('an element that may not be dragged is fixed in its grid (rule 11)', () => {
    const { container } = render();
    const item = (id: string) => container.querySelector(`.grid-stack-item[gs-id="${id}"]`)!;
    expect(item('c-a')).toHaveAttribute('gs-no-move', 'true');
    expect(item('h')).not.toHaveAttribute('gs-no-move');
  });

  it('locked inline edits render read-only: Heading text and Form title (rule 14)', () => {
    const { container, update } = render();
    const heading = element(container, 'h').querySelector<HTMLElement>(
      '[data-slot="heading-element"]',
    )!;
    expect(heading).not.toHaveClass('cursor-text');
    fireEvent.click(heading);
    expect(element(container, 'h').querySelector('[data-editing]')).toBeNull();
    const title = container.querySelector<HTMLElement>('[data-slot="form-title"]')!;
    fireEvent.click(title);
    expect(title).not.toHaveAttribute('contenteditable', 'plaintext-only');
    expect(title).not.toHaveClass('cursor-text');
    expect(update).not.toHaveBeenCalled();
  });

  it('an ungoverned page keeps every affordance', () => {
    const { container } = renderStudioRenderers(PAGE, {
      schema: SCHEMA,
      removable: true,
      copyable: true,
    });
    expect(
      within(element(container, 'c-a')).getByRole('button', { name: 'Delete A' }),
    ).toBeEnabled();
    expect(container.querySelector('[data-slot="studio-lock-badge"]')).toBeNull();
    expect(container.querySelector('[gs-no-move]')).toBeNull();
  });
});
