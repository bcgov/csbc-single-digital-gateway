import {
  NOT_APPLICABLE,
  type JsonSchema,
  type Translator,
  type UISchemaElement,
} from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as ui from '../src/renderers-ui';

// Doc 180 rules 1-5 — @repo/forms/renderers/ui (Heading display renderer).

const schema: JsonSchema = {
  type: 'object',
  properties: { hidden: { type: 'boolean' } },
};

const renderers = [...ui.controlRenderers, ...ui.displayRenderers, ...ui.layoutRenderers];

interface RenderOptions {
  data?: Record<string, unknown>;
  translate?: Translator;
}

function renderElement(uischema: object, { data = {}, translate: translator }: RenderOptions = {}) {
  const props = {
    schema,
    uischema: uischema as UISchemaElement,
    data,
    renderers,
    cells: ui.cells,
  };
  // Two branches rather than a conditional spread: exactOptionalPropertyTypes rejects `i18n?: …`.
  return render(
    translator ? (
      <JsonForms {...props} i18n={{ translate: translator }} />
    ) : (
      <JsonForms {...props} />
    ),
  );
}

const testerContext = { rootSchema: schema, config: {} };
const headingEntry = () => ui.displayRenderers[0];

const TRANSLATIONS: Record<string, string> = { Hello: 'Bonjour', 'greeting.text': 'Salut' };

// `Translator` is overloaded (a defined default message guarantees a string), which a single
// implementation signature can't express — hence the cast.
const translate = ((key: string, defaultMessage: string | undefined) =>
  TRANSLATIONS[key] ?? defaultMessage) as Translator;

describe('renderers/ui set shape', () => {
  // Doc 182 rule 8 and doc 188 rule 4 — the control renderers are covered in the renderers-ui-*controls tests.
  it('exports empty cells and layoutRenderers, seven controlRenderers and one Heading entry in displayRenderers', () => {
    expect(ui.cells).toEqual([]);
    expect(ui.controlRenderers).toHaveLength(7);
    expect(ui.layoutRenderers).toEqual([]);
    expect(ui.displayRenderers).toHaveLength(1);
    expect(headingEntry()?.renderer).toBeDefined();
  });

  it("ranks a { type: 'Heading' } uischema 1 and does not match Label, Control or Grid", () => {
    const tester = headingEntry()?.tester;
    expect(tester?.({ type: 'Heading' }, schema, testerContext)).toBe(1);
    expect(tester?.({ type: 'Label' }, schema, testerContext)).toBe(NOT_APPLICABLE);
    expect(tester?.({ type: 'Control' }, schema, testerContext)).toBe(NOT_APPLICABLE);
    expect(tester?.({ type: 'Grid' }, schema, testerContext)).toBe(NOT_APPLICABLE);
  });
});

describe('Heading renderer', () => {
  it('renders an <h3> with the text-h5 size class for options { level: 3, size: 5 }', () => {
    renderElement({ type: 'Heading', text: 'Title', options: { level: 3, size: 5 } });
    const heading = screen.getByRole('heading', { level: 3, name: 'Title' });
    expect(heading.tagName).toBe('H3');
    expect(heading).toHaveClass('text-h5', 'font-bold');
  });

  it('renders an <h1> with no size class when options are absent', () => {
    renderElement({ type: 'Heading', text: 'Title' });
    const heading = screen.getByRole('heading', { name: 'Title' });
    expect(heading.tagName).toBe('H1');
    // No size → no class attribute at all; base styles size the bare element (doc 179).
    expect(heading.getAttribute('class')).toBeNull();
  });

  it("treats an invalid level (0, 7, 2.5, '2') as absent and renders an <h1>", () => {
    for (const level of [0, 7, 2.5, '2']) {
      const { unmount } = renderElement({ type: 'Heading', text: 'Title', options: { level } });
      expect(screen.getByRole('heading', { name: 'Title' }).tagName, String(level)).toBe('H1');
      unmount();
    }
  });

  it('treats an invalid size as absent and emits no size class', () => {
    for (const size of [0, 9, 1.5, '3']) {
      const { unmount } = renderElement({
        type: 'Heading',
        text: 'Title',
        options: { level: 2, size },
      });
      const heading = screen.getByRole('heading', { level: 2, name: 'Title' });
      expect(heading.getAttribute('class'), String(size)).toBeNull();
      unmount();
    }
  });

  it('renders nothing when text is empty or whitespace-only', () => {
    for (const text of ['', '   ']) {
      const { container, unmount } = renderElement({ type: 'Heading', text });
      expect(screen.queryByRole('heading')).toBeNull();
      expect(container.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
      unmount();
    }
  });

  it('renders nothing when a rule hides the element', () => {
    const uischema = {
      type: 'Heading',
      text: 'Title',
      rule: {
        effect: 'HIDE',
        condition: { scope: '#/properties/hidden', schema: { const: true } },
      },
    };
    const { unmount } = renderElement(uischema, { data: { hidden: true } });
    expect(screen.queryByRole('heading')).toBeNull();
    unmount();

    // Control case: the same element renders once the rule no longer applies.
    renderElement(uischema, { data: { hidden: false } });
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
  });

  it('translates text through the JSONForms i18n translator', () => {
    const { unmount } = renderElement({ type: 'Heading', text: 'Hello' }, { translate });
    expect(screen.getByRole('heading', { name: 'Bonjour' })).toBeInTheDocument();
    expect(screen.queryByText('Hello')).toBeNull();
    unmount();

    // With an i18n key the translator is asked for `<key>.text`.
    renderElement({ type: 'Heading', text: 'Hello', i18n: 'greeting' }, { translate });
    expect(screen.getByRole('heading', { name: 'Salut' })).toBeInTheDocument();
  });
});
