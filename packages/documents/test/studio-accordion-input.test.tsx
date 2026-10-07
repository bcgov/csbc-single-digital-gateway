import { createAjv } from '@jsonforms/core';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { isObjectArray } from '../src/renderers/ui/object-array';
import type { DocumentContent } from '../src/studio/document-types';
import { fieldsFor } from '../src/studio/inspector/inspector-form';
import { inspectorTarget, KIND_NAMES } from '../src/studio/inspector/inspector-target';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { renderStudioRenderers } from './render-studio-renderers';

const SCHEMA = {
  type: 'object',
  properties: {
    faq: {
      type: 'array',
      title: 'Questions',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Question', pattern: '\\S' },
          content: { type: 'object', required: ['root'], title: 'Answer' },
        },
        required: ['title', 'content'],
      },
    },
  },
};
const CONTROL = {
  id: 'a',
  type: 'Control',
  scope: '#/properties/faq',
  options: { component: 'accordion', addLabel: 'Add question' },
};
const PAGE = { id: 'F', type: 'Form', label: 'Page', elements: [CONTROL] };

describe('studio accordion input (doc 280 rule 11)', () => {
  it('draws the shell, one greyed sample item labelled from the schema, and a disabled Add', () => {
    const { container } = renderStudioRenderers(PAGE, { schema: SCHEMA });
    const element = container.querySelector<HTMLElement>('[data-element-id="a"]')!;
    expect(element.querySelector('[data-component="accordion"]')).not.toBeNull();
    expect(within(element).getByText('Questions')).toBeInTheDocument();
    const samples = element.querySelectorAll('[data-slot="accordion-input-item"]');
    expect(samples).toHaveLength(1);
    expect(within(element).getByText('Question')).toBeInTheDocument();
    expect(within(element).getByText('Answer')).toBeInTheDocument();
    expect(
      within(element).getByRole('button', { name: 'Add question', hidden: true }),
    ).toBeDisabled();
    // No item actions on the canvas: there are no answers to move or remove.
    expect(
      within(element).queryByRole('button', { name: /^(Move|Remove) item/, hidden: true }),
    ).toBeNull();
  });

  it('is wrapped inert like the other studio controls, so a click selects it', () => {
    const { container } = renderStudioRenderers(PAGE, { schema: SCHEMA });
    const element = container.querySelector<HTMLElement>('[data-element-id="a"]')!;
    expect(
      element.querySelector(':scope > [data-slot="studio-element-body"][inert]'),
    ).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Add item' })).toBeNull();
  });
});

const content = (): DocumentContent =>
  ({ schema: SCHEMA, variants: { default: PAGE } }) as unknown as DocumentContent;
const target = () =>
  inspectorTarget(content(), { pageSelectedId: 'a', focusedId: 'F', formId: 'F' })!;

describe('accordion input inspector (doc 280 rule 12)', () => {
  it('gives it its own kind, "Accordion"', () => {
    expect(target().kind).toBe('accordion-input');
    expect(KIND_NAMES['accordion-input' as keyof typeof KIND_NAMES]).toBe('Accordion');
  });

  it('offers the Control fields, the row options and the Add item label — no page size', () => {
    const keys = fieldsFor(target()).map((field) => field.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'label',
        'required',
        'minRows',
        'maxRows',
        'addRows',
        'deleteRows',
        'addItemLabel',
      ]),
    );
    expect(keys).not.toContain('pageSize');
    expect(keys).not.toContain('addLabel');
  });
});

const item = () => DEFAULT_PALETTE_ITEMS.find((candidate) => candidate.id === 'accordion-input');

describe('Accordion palette item (doc 280 rule 13)', () => {
  it('sits in Record fields after Record', () => {
    const ids = DEFAULT_PALETTE_ITEMS.filter((c) => c.group === 'Record fields').map((c) => c.id);
    expect(ids.indexOf('accordion-input')).toBe(ids.indexOf('record') + 1);
    expect(item()).toMatchObject({
      label: 'Accordion',
      keywords: ['accordion', 'faq', 'questions', 'items', 'repeat'],
    });
  });

  it('creates an accordion Control over a fresh, complete-item property', () => {
    const [a, b] = [item()!.create(), item()!.create()];
    const [key] = Object.keys(a.properties!);
    expect(key).toHaveLength(8);
    expect(key).not.toBe(Object.keys(b.properties!)[0]);
    expect(a.element).toMatchObject({
      type: 'Control',
      scope: `#/properties/${key}`,
      options: { component: 'accordion' },
    });
    const property = a.properties![key!];
    expect(isObjectArray(property)).toBe(true);
    expect(property).toEqual({
      type: 'array',
      title: 'Untitled accordion',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Title', pattern: '\\S' },
          content: { type: 'object', required: ['root'], title: 'Content' },
        },
        required: ['title', 'content'],
      },
    });
  });
});

describe('accordion input item completeness (doc 280 rule 3)', () => {
  it('refuses an item missing its title or content, or with a blank title, at submit', () => {
    const creation = item()!.create();
    const [key] = Object.keys(creation.properties!);
    const validate = createAjv().compile({
      type: 'object',
      properties: creation.properties!,
    });
    const body = { root: { children: [], type: 'root', version: 1 } };
    const answer = (items: unknown[]) => ({ [key!]: items });
    expect(validate(answer([{ title: 'Who can apply?', content: body }]))).toBe(true);
    expect(validate(answer([{ title: 'Who can apply?' }]))).toBe(false);
    expect(validate(answer([{ content: body }]))).toBe(false);
    expect(validate(answer([{ title: '   ', content: body }]))).toBe(false);
  });
});
