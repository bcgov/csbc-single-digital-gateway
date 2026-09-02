import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AccordionGroupView, displayRenderers } from '../src/jsonforms-renderers-display';
import { accordionGroupDisplayTester } from '../src/jsonforms-renderers-display/controls/accordion-group-display';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    faq: {
      type: 'array',
      title: 'Frequently asked questions',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'object' },
        },
      },
    },
  },
};

/** A minimal Lexical editor state carrying one line of text. */
const richText = (text: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          { type: 'text', text, format: 0, style: '', mode: 'normal', detail: 0, version: 1 },
        ],
      },
    ],
  },
});

const items = [
  { id: 'aaaaaaaa', title: 'First question', description: richText('First answer') },
  { id: 'bbbbbbbb', title: 'Second question', description: richText('Second answer') },
];

function uischemaFor(options: Record<string, unknown> = {}): UISchemaElement {
  return {
    type: 'VerticalLayout',
    elements: [
      {
        type: 'Control',
        scope: '#/properties/faq',
        label: 'Frequently asked questions',
        options: { format: 'accordion-group', ...options },
      },
    ],
  } as unknown as UISchemaElement;
}

function Display({
  data,
  options = {},
  formSchema = schema,
}: {
  data: Record<string, unknown>;
  options?: Record<string, unknown>;
  formSchema?: JsonSchema;
}) {
  return (
    <JsonForms
      schema={formSchema}
      uischema={uischemaFor(options)}
      data={data}
      renderers={displayRenderers}
      cells={[]}
      onChange={() => {}}
    />
  );
}

/** Base UI marks a closed accordion panel `hidden`; an open one is visible. */
const openTitles = (): string[] =>
  screen
    .getAllByRole('button', { name: /question/ })
    .filter((trigger) => trigger.getAttribute('aria-expanded') === 'true')
    .map((trigger) => trigger.textContent ?? '');

/**
 * MDD doc 171 — the read-only accordion-group display renderer (same tester/rank as the form
 * control) plus the exported presentational `<AccordionGroupView value={raw} />`.
 */
describe('accordion-group display (feature 171)', () => {
  describe('dispatch', () => {
    it('wins dispatch in the display registry for options.format = "accordion-group"', () => {
      const element = {
        type: 'Control',
        scope: '#/properties/faq',
        options: { format: 'accordion-group' },
      } as unknown as UISchemaElement;
      expect(accordionGroupDisplayTester(element, schema, { rootSchema: schema, config: {} })).toBe(
        5,
      );
    });
  });

  describe('rendering', () => {
    it('renders the group label and description in the AccordionGroup header', () => {
      const described: JsonSchema = {
        type: 'object',
        properties: {
          faq: { ...(schema.properties?.faq as object), description: 'Common questions' },
        },
      };
      render(<Display data={{ faq: items }} formSchema={described} />);
      expect(screen.getByText('Frequently asked questions')).toBeInTheDocument();
      expect(screen.getByText('Common questions')).toBeInTheDocument();
    });

    it('renders one collapsible section per item, titled by the item title', () => {
      render(<Display data={{ faq: items }} />);
      expect(screen.getByRole('button', { name: 'First question' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Second question' })).toBeInTheDocument();
    });

    it('renders each item description through RichTextView', () => {
      render(<Display data={{ faq: items }} options={{ defaultOpen: 'all' }} />);
      expect(screen.getByText('First answer')).toBeInTheDocument();
      expect(screen.getByText('Second answer')).toBeInTheDocument();
    });

    it('renders the em-dash EmptyValue (no accordion chrome) when the value is empty', () => {
      render(<Display data={{ faq: [] }} />);
      expect(screen.getByText('—')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /question/ })).not.toBeInTheDocument();
    });

    it('renders a malformed blob as empty instead of throwing', () => {
      // normalizeAccordionItems is the guard — junk in, empty out.
      expect(() => render(<Display data={{ faq: 'not an array' }} />)).not.toThrow();
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('offers the expand/collapse-all toggle from @repo/ui AccordionGroup', () => {
      render(<Display data={{ faq: items }} />);
      expect(screen.getByRole('button', { name: /Expand all sections/ })).toBeInTheDocument();
    });
  });

  describe('defaultOpen', () => {
    it('opens nothing when defaultOpen is unset (defaults to "none")', () => {
      render(<Display data={{ faq: items }} />);
      expect(openTitles()).toEqual([]);
    });

    it('opens only the first section for "first"', () => {
      render(<Display data={{ faq: items }} options={{ defaultOpen: 'first' }} />);
      expect(openTitles()).toEqual(['First question']);
    });

    it('opens every section for "all"', () => {
      render(<Display data={{ faq: items }} options={{ defaultOpen: 'all' }} />);
      expect(openTitles()).toEqual(['First question', 'Second question']);
    });
  });

  describe('AccordionGroupView (exported for out-of-dispatch use)', () => {
    it('renders a raw value outside a JsonForms dispatch, like ContactMethodsView', () => {
      render(<AccordionGroupView value={items} title="FAQ" defaultOpen="all" />);
      expect(screen.getByText('FAQ')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'First question' })).toBeInTheDocument();
      expect(screen.getByText('First answer')).toBeInTheDocument();
    });

    it('renders the em-dash for an empty or malformed value', () => {
      render(<AccordionGroupView value={undefined} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('module graph invariant', () => {
    it('keeps @dnd-kit out of the display module (model.ts must never import it)', () => {
      // The display renderer imports ONLY model.ts from the form module. If model.ts ever imports
      // @dnd-kit, every read-only surface (citizen service pages, staff review) drags it in.
      const displaySide = [
        '../src/jsonforms-renderers/controls/accordion-group/model.ts',
        '../src/jsonforms-renderers-display/controls/accordion-group-view.tsx',
        '../src/jsonforms-renderers-display/controls/accordion-group-display.tsx',
        '../src/jsonforms-renderers-display/display-renderers.tsx',
      ];
      for (const relative of displaySide) {
        const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
        expect(source, `${relative} must not import @dnd-kit`).not.toContain("from '@dnd-kit");
      }
    });
  });
});
