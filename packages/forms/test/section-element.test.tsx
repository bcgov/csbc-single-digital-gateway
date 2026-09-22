import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers-default';
import { SECTION_HEADING_CLASS } from '../src/renderers/gridstack/section-renderer';
import { richText } from './rich-text-fixtures';

// Doc 212 rules 1-3, 8-17 — the Section as it renders in a fillable form, through the real renderers/default
// registry: the same testers that pick a VerticalLayout must pick this.

const schema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' } },
};

const el = (element: object) => element as UISchemaElement;
const heading = (text: string) => ({ type: 'Heading', text });
const section = (element: object = {}) => ({ type: 'Section', ...element });
const formRoot = (elements: object[]) => el({ type: 'Form', elements });

const renderFill = (uischema: UISchemaElement) =>
  render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={{}}
      renderers={[
        ...defaults.controlRenderers,
        ...defaults.displayRenderers,
        ...defaults.layoutRenderers,
      ]}
      cells={defaults.cells}
      validationMode="NoValidation"
    />,
  );

const sectionNodes = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('[data-slot="section"]'),
];
const headingNode = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="section-heading"]');
/** The COLUMN inside the Section — the vertical layout renderer, not the Section's own wrapper. */
const columnOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="fill-layout"][data-layout-type="Section"]');

describe('the element (rules 1-2)', () => {
  it('renders its children in order, as a VerticalLayout does', () => {
    const { container } = renderFill(
      formRoot([section({ label: 'Contact', elements: [heading('One'), heading('Two')] })]),
    );

    const column = columnOf(container);
    expect(column).toBeInTheDocument();
    expect(column?.textContent).toBe('OneTwo');
  });

  it('is matched by exactly one entry in the fill registry', () => {
    const testerContext = { rootSchema: schema, config: undefined };
    const matching = defaults.layoutRenderers.filter(
      (entry) => entry.tester({ type: 'Section' } as UISchemaElement, schema, testerContext) > 0,
    );
    expect(matching).toHaveLength(1);
  });

  it('spaces the children by options.gap, and by the default gap when none is authored', () => {
    const authored = renderFill(
      formRoot([section({ elements: [heading('One')], options: { gap: 'xl' } })]),
    );
    expect(columnOf(authored.container)).toHaveClass('gap-8');

    const bare = renderFill(formRoot([section({ elements: [heading('One')] })]));
    expect(columnOf(bare.container)).toHaveClass('gap-4');
  });

  it('uses that same gap under the heading, so the Section is internally consistent (rule 2b)', () => {
    const { container } = renderFill(
      formRoot([section({ label: 'Contact', elements: [heading('One')], options: { gap: 'xl' } })]),
    );
    expect(sectionNodes(container)[0]).toHaveClass('gap-8');
  });

  it('renders an empty Section without error', () => {
    const { container } = renderFill(formRoot([section({ label: 'Empty', elements: [] })]));

    expect(headingNode(container)).toHaveTextContent('Empty');
    expect(columnOf(container)?.textContent).toBe('');
  });

  it('renders a control inside a Section, so the column really is a layout', () => {
    renderFill(
      formRoot([
        section({
          label: 'Contact',
          elements: [{ type: 'Control', scope: '#/properties/name' }],
        }),
      ]),
    );

    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
  });
});

describe('the heading (rules 8-12)', () => {
  it('renders the label with the section-heading class', () => {
    const { container } = renderFill(
      formRoot([section({ label: 'Contact', elements: [heading('One')] })]),
    );

    const node = headingNode(container);
    expect(node).toHaveTextContent('Contact');
    expect(node).toHaveClass(SECTION_HEADING_CLASS);
  });

  it('carries its own size utility, since base styles size bare h1-h6 (rule 11)', () => {
    const { container } = renderFill(
      formRoot([section({ label: 'Contact', elements: [heading('One')] })]),
    );

    // Doc 191's caption bug: a size class on an ancestor never reaches a bare heading element.
    expect(headingNode(container)?.className).toMatch(/text-h\d/);
  });

  it('renders NO heading when the label is absent or empty', () => {
    const absent = renderFill(formRoot([section({ elements: [heading('One')] })]));
    expect(headingNode(absent.container)).toBeNull();

    const empty = renderFill(formRoot([section({ label: '   ', elements: [heading('One')] })]));
    expect(headingNode(empty.container)).toBeNull();
  });

  it('renders h2 at the top level, under a Form title h1', () => {
    const { container } = renderFill(
      formRoot([section({ label: 'Contact', elements: [heading('One')] })]),
    );

    expect(headingNode(container)?.tagName).toBe('H2');
  });

  it('renders h3 for a Section inside a Section, and h4 inside that', () => {
    const { container } = renderFill(
      formRoot([
        section({
          label: 'Outer',
          elements: [
            section({
              label: 'Middle',
              elements: [section({ label: 'Inner', elements: [] })],
            }),
          ],
        }),
      ]),
    );

    const levels = [...container.querySelectorAll('[data-slot="section-heading"]')].map(
      (node) => node.tagName,
    );
    expect(levels).toEqual(['H2', 'H3', 'H4']);
  });

  it('counts SECTION depth, not layout depth — a VerticalLayout in between changes nothing', () => {
    const { container } = renderFill(
      formRoot([
        section({
          label: 'Outer',
          elements: [
            {
              type: 'VerticalLayout',
              elements: [{ type: 'Grid', elements: [section({ label: 'Inner', elements: [] })] }],
            },
          ],
        }),
      ]),
    );

    const levels = [...container.querySelectorAll('[data-slot="section-heading"]')].map(
      (node) => node.tagName,
    );
    // Two Sections deep, whatever sits between them.
    expect(levels).toEqual(['H2', 'H3']);
  });

  it('caps at h6', () => {
    // Six nested Sections: h2, h3, h4, h5, h6, h6.
    const nest = (depth: number): object =>
      section({ label: `L${depth}`, elements: depth === 0 ? [] : [nest(depth - 1)] });
    const { container } = renderFill(formRoot([nest(5)]));

    const levels = [...container.querySelectorAll('[data-slot="section-heading"]')].map(
      (node) => node.tagName,
    );
    expect(levels).toEqual(['H2', 'H3', 'H4', 'H5', 'H6', 'H6']);
  });

  it('hides the heading and description with a rule that hides the Section (rule 12)', () => {
    const { container } = renderFill(
      formRoot([
        section({
          label: 'Hidden',
          elements: [heading('One')],
          rule: { effect: 'HIDE', condition: {} },
        }),
      ]),
    );

    expect(headingNode(container)).toBeNull();
    expect(container.textContent).not.toContain('One');
  });
});

describe('the description (rule 3)', () => {
  const withDescription = (description: unknown, label?: string) =>
    renderFill(
      formRoot([
        section({
          ...(label === undefined ? {} : { label }),
          elements: [heading('One')],
          options: { description },
        }),
      ]),
    );

  it('renders authored rich content under the heading', () => {
    const { container } = withDescription(richText('Tell us how to reach you'), 'Contact');

    expect(screen.getByText('Tell us how to reach you')).toBeInTheDocument();
    // Under it, not above: the title block is one column, heading first.
    const title = container.querySelector('[data-slot="section-title"]');
    expect(title?.firstElementChild).toBe(headingNode(container));
  });

  it('renders nothing for an absent description', () => {
    const { container } = renderFill(
      formRoot([section({ label: 'Contact', elements: [heading('One')] })]),
    );
    expect(container.querySelector('[data-slot="section-description"]')).toBeNull();
  });

  it('renders nothing for a malformed value Lexical could not seed from', () => {
    // Doc 207 rule 4's guard: the code panel can author `{}` or a string, and either crashes Lexical.
    for (const malformed of [{}, 'a sentence', 42, { root: 'no' }]) {
      const { container } = withDescription(malformed, 'Contact');
      expect(container.querySelector('[data-slot="section-description"]')).toBeNull();
    }
  });

  it('renders the description with no heading when only a description is authored', () => {
    const { container } = withDescription(richText('Just the description'));

    expect(headingNode(container)).toBeNull();
    expect(container.querySelector('[data-slot="section-description"]')).toBeInTheDocument();
  });
});

describe('the variants (rules 13-17)', () => {
  const sectionOf = (options: object) =>
    renderFill(formRoot([section({ label: 'Contact', elements: [heading('One')], options })]));
  const bodyOf = (container: HTMLElement) => container.querySelector('[data-slot="section-body"]');

  it('draws no box for the default plain variant, and adds no wrapper element at all', () => {
    const { container } = renderFill(
      formRoot([section({ label: 'Contact', elements: [heading('One')] })]),
    );

    expect(sectionNodes(container)[0]).toHaveAttribute('data-variant', 'plain');
    expect(bodyOf(container)).toBeNull();
  });

  it('draws a border, the gray-20 ground and rounded corners for container', () => {
    const { container } = sectionOf({ variant: 'container' });

    expect(sectionNodes(container)[0]).toHaveAttribute('data-variant', 'container');
    expect(bodyOf(container)).toHaveClass('border', 'bg-gray-20', 'rounded-md');
  });

  it('boxes the CHILDREN only — the heading and description stay outside it (rule 14)', () => {
    const { container } = renderFill(
      formRoot([
        section({
          label: 'Contact',
          elements: [heading('One')],
          options: { variant: 'container', description: richText('Under the heading') },
        }),
      ]),
    );

    const body = bodyOf(container);
    expect(body).toBeInTheDocument();
    // The title names the box; it does not sit in it.
    expect(body).not.toContainElement(headingNode(container));
    expect(body).not.toContainElement(
      container.querySelector<HTMLElement>('[data-slot="section-description"]'),
    );
    expect(body).toContainElement(columnOf(container));
  });

  it('insets the BOX by the authored inset, and by md when none is authored', () => {
    expect(bodyOf(sectionOf({ variant: 'container' }).container)).toHaveClass('p-4');
    expect(bodyOf(sectionOf({ variant: 'container', inset: 'xs' }).container)).toHaveClass('p-1');
    expect(bodyOf(sectionOf({ variant: 'container', inset: 'lg' }).container)).toHaveClass('p-6');
    expect(bodyOf(sectionOf({ variant: 'container', inset: 'xl' }).container)).toHaveClass('p-8');
  });

  it('IGNORES an inset authored on a plain Section, and keeps it in the document (rule 16)', () => {
    const authored = { inset: 'xl' };
    const { container } = sectionOf(authored);

    expect(bodyOf(container)).toBeNull();
    expect(container.innerHTML).not.toContain('p-8');
    // Inert, not stripped — the treatment doc 198 gives Stage.options.position.
    expect(authored.inset).toBe('xl');
  });

  it('reads an unrecognised variant as plain rather than failing to render', () => {
    const { container } = sectionOf({ variant: 'boxed' });

    expect(sectionNodes(container)[0]).toHaveAttribute('data-variant', 'plain');
    expect(headingNode(container)).toHaveTextContent('Contact');
  });
});
