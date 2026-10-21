import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as ui from '../src/renderers-ui';
import { NOT_ANSWERED } from '../src/renderers/ui/control-plain-field';
import { PLAIN_CONFIG } from '../src/renderers/ui/control-presentation';
import { richText, richTextProperty } from './rich-text-fixtures';

// Doc 211 rules 5-13 — what a control renders under `config.presentation: 'plain'`, through the real
// <JsonForms> and the real renderers/ui registry: the point of the feature is that the SAME tester picks the
// SAME control, so dispatch must not be stubbed.

const renderers = [...ui.controlRenderers, ...ui.displayRenderers, ...ui.layoutRenderers];

// JsonSchema is a JsonSchema4 | JsonSchema7 union whose members disagree under exactOptionalPropertyTypes, so
// a fixture is cast once, exactly as the other renderer tests do.
const schemaOf = (properties: Record<string, unknown>): JsonSchema =>
  ({ type: 'object', properties }) as unknown as JsonSchema;

const control = (property: string, options?: Record<string, unknown>): UISchemaElement =>
  ({
    type: 'Control',
    scope: `#/properties/${property}`,
    ...(options ? { options } : {}),
  }) as UISchemaElement;

/**
 * One control, rendered in whichever presentation the config names.
 *
 * `FILL` rather than `undefined` for the editable case: an explicit `undefined` argument takes a default
 * parameter, so passing it here would render the PLAIN field and the test would pass for the wrong reason.
 */
const FILL = {};

const renderPlain = (
  schema: JsonSchema,
  uischema: UISchemaElement,
  data: Record<string, unknown>,
  config: unknown = PLAIN_CONFIG,
) =>
  render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={renderers}
      cells={ui.cells}
      config={config}
      validationMode="NoValidation"
    />,
  );

const value = (container: HTMLElement) =>
  container.querySelector('[data-slot="plain-field-value"]');

const province = schemaOf({
  province: {
    type: 'string',
    oneOf: [
      { const: 'bc', title: 'British Columbia' },
      { const: 'ab', title: 'Alberta' },
    ],
  },
});

const contact = schemaOf({
  contact: {
    type: 'array',
    uniqueItems: true,
    items: {
      type: 'string',
      oneOf: [
        { const: 'email', title: 'Email' },
        { const: 'post', title: 'Post' },
      ],
    },
  },
});

describe('PlainField chrome (rules 5-7)', () => {
  it('renders the label and the value, and no input, for a string control', () => {
    const { container } = renderPlain(schemaOf({ name: { type: 'string' } }), control('name'), {
      name: 'Jo Rivers',
    });

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(value(container)).toHaveTextContent('Jo Rivers');
    expect(container.querySelector('input, textarea, select')).toBeNull();
  });

  it('renders no character counter for a control with maxLength (rule 6)', () => {
    const { container } = renderPlain(
      schemaOf({ name: { type: 'string', maxLength: 20 } }),
      control('name'),
      { name: 'Jo Rivers' },
    );

    expect(container.querySelector('[data-slot="control-field-counter"]')).toBeNull();
  });

  it('renders no error and no aria-invalid for data that fails the schema (rules 6, 16)', () => {
    // Validation is on for this one render: the point is that the plain field shows nothing of it even when
    // JSONForms does report an error for the value.
    const { container } = render(
      <JsonForms
        schema={schemaOf({ name: { type: 'string', minLength: 50 } })}
        uischema={control('name')}
        data={{ name: 'too short' }}
        renderers={renderers}
        cells={ui.cells}
        config={PLAIN_CONFIG}
      />,
    );

    expect(container.querySelector('[data-slot="field-error"]')).toBeNull();
    expect(container.querySelector('[aria-invalid]')).toBeNull();
    expect(value(container)).toHaveTextContent('too short');
  });

  it('renders the schema description alongside the value (rule 6)', () => {
    const { container } = renderPlain(
      schemaOf({ name: { type: 'string', description: 'As it appears on your ID.' } }),
      control('name'),
      { name: 'Jo Rivers' },
    );

    expect(container.querySelector('[data-slot="field-description"]')).toHaveTextContent(
      'As it appears on your ID.',
    );
  });

  it('renders nothing for a hidden control, and no label for label:false (rule 6)', () => {
    const hidden = renderPlain(
      schemaOf({ name: { type: 'string' } }),
      {
        ...control('name'),
        rule: { effect: 'HIDE', condition: {} },
      } as UISchemaElement,
      { name: 'Jo Rivers' },
    );
    expect(hidden.container.querySelector('[data-slot="plain-field"]')).toBeNull();

    const unlabelled = renderPlain(
      schemaOf({ name: { type: 'string' } }),
      { ...control('name'), label: false } as UISchemaElement,
      { name: 'Jo Rivers' },
    );
    expect(unlabelled.container.querySelector('[data-slot="plain-field-label"]')).toBeNull();
    expect(value(unlabelled.container)).toHaveTextContent('Jo Rivers');
  });

  it('names the value without a <label> htmlFor, since there is no control to point at (rule 7)', () => {
    const { container } = renderPlain(schemaOf({ name: { type: 'string' } }), control('name'), {
      name: 'Jo Rivers',
    });

    expect(container.querySelector('label')).toBeNull();
    expect(container.querySelector('[data-slot="plain-field-label"]')).toHaveTextContent('Name');
  });

  it('renders no asterisk for a required field — a submission has already met the rule or not', () => {
    const schema = {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    } as unknown as JsonSchema;
    const { container } = renderPlain(schema, control('name'), { name: 'Jo Rivers' });

    expect(container.querySelector('[data-slot="plain-field-label"]')).toHaveTextContent(/^Name$/);
  });

  it('does not mark the field disabled, even though JSONForms reports enabled:false (rule 3)', () => {
    const { container } = renderPlain(schemaOf({ name: { type: 'string' } }), control('name'), {
      name: 'Jo Rivers',
    });

    expect(container.querySelector('[data-slot="plain-field"]')).not.toHaveAttribute(
      'data-disabled',
    );
  });
});

describe('an unanswered field (rule 9)', () => {
  it('renders a muted "Not answered" rather than an empty slot', () => {
    const { container } = renderPlain(schemaOf({ name: { type: 'string' } }), control('name'), {});

    const shown = value(container);
    expect(shown).toHaveTextContent(NOT_ANSWERED);
    expect(shown).toHaveAttribute('data-empty');
  });

  it('says it identically for a string, a choice and a boolean control', () => {
    // One render each: the renderers/ui set holds no layout renderers (they are renderers/default's), so a
    // layout element here would draw nothing at all and the assertion would pass vacuously.
    const shown = [
      renderPlain(schemaOf({ name: { type: 'string' } }), control('name'), {}),
      renderPlain(province, control('province'), {}),
      renderPlain(schemaOf({ agreed: { type: 'boolean' } }), control('agreed'), {}),
    ].map(({ container }) => value(container));

    expect(shown).toHaveLength(3);
    for (const node of shown) expect(node).toHaveTextContent(NOT_ANSWERED);
  });
});

describe('each control kind renders its own plain value (rule 11)', () => {
  it('shows a Combobox answer as the option label', () => {
    const { container } = renderPlain(province, control('province'), { province: 'bc' });
    expect(value(container)).toHaveTextContent('British Columbia');
  });

  it('shows a RadioGroup answer as the option label', () => {
    const { container } = renderPlain(province, control('province', { component: 'radio-group' }), {
      province: 'ab',
    });
    expect(value(container)).toHaveTextContent('Alberta');
  });

  it('shows a Checkbox and a Switch answer as Yes or No', () => {
    const schema = schemaOf({ agreed: { type: 'boolean' } });

    const box = renderPlain(schema, control('agreed'), { agreed: true });
    expect(value(box.container)).toHaveTextContent('Yes');

    const toggle = renderPlain(schema, control('agreed', { component: 'switch' }), {
      agreed: false,
    });
    expect(value(toggle.container)).toHaveTextContent('No');
  });

  it('shows a MultiCombobox and a CheckboxGroup answer as the chosen labels', () => {
    const chips = renderPlain(contact, control('contact'), { contact: ['post', 'email'] });
    // Authoring order, not click order (doc 205 rule 8).
    expect(chips.container.querySelectorAll('[data-slot="plain-field-list"] li')).toHaveLength(2);
    expect(value(chips.container)).toHaveTextContent('Email');

    const boxes = renderPlain(contact, control('contact', { component: 'checkbox-group' }), {
      contact: ['post'],
    });
    expect(value(boxes.container)).toHaveTextContent('Post');
  });

  it('shows a NumberInput answer formatted as the field formatted it', () => {
    const { container } = renderPlain(
      schemaOf({ fee: { type: 'number' } }),
      control('fee', { decimals: 2 }),
      { fee: 12.5 },
    );
    expect(value(container)).toHaveTextContent('12.50');
  });

  it('shows a Textarea answer with its line breaks preserved', () => {
    const { container } = renderPlain(
      schemaOf({ notes: { type: 'string' } }),
      control('notes', { component: 'textarea' }),
      { notes: 'line one\nline two' },
    );
    // jsdom computes no styles for a utility class, so the class is what can be asserted here.
    expect(value(container)).toHaveClass('whitespace-pre-line');
    expect(value(container)?.textContent).toContain('line one\nline two');
  });

  it('shows a RichText answer through RichTextView, not its editor', () => {
    const { container } = renderPlain(
      schemaOf({ background: richTextProperty() }),
      control('background'),
      { background: richText('Read me') },
    );

    expect(screen.getByText('Read me')).toBeInTheDocument();
    // `RichTextView` is a Lexical editor in read-only mode, so it has a contenteditable of its OWN — what
    // must not be there is an EDITABLE one.
    expect(container.querySelector('[contenteditable="true"]')).toBeNull();
  });

  it('shows an empty RichText answer as unanswered (rule 9)', () => {
    const { container } = renderPlain(
      schemaOf({ background: richTextProperty() }),
      control('background'),
      {},
    );

    expect(value(container)).toHaveTextContent(NOT_ANSWERED);
  });

  it('shows a masked answer re-masked (rule 12)', () => {
    const { container } = renderPlain(
      schemaOf({ phone: { type: 'string' } }),
      control('phone', { mask: '(999) 999-9999', maskUnmasked: true }),
      { phone: '6045551234' },
    );
    expect(value(container)).toHaveTextContent('(604) 555-1234');
  });
});

describe('the fill and readonly presentations are untouched (rule 2)', () => {
  it('still renders a real input with no config at all', () => {
    const { container } = renderPlain(
      schemaOf({ name: { type: 'string' } }),
      control('name'),
      { name: 'Jo Rivers' },
      FILL,
    );

    expect(container.querySelector('input')).toHaveValue('Jo Rivers');
    expect(container.querySelector('[data-slot="plain-field"]')).toBeNull();
  });

  it('still renders doc 202 rule 50 read-only inputs for config.readonly', () => {
    const { container } = renderPlain(
      schemaOf({ name: { type: 'string' } }),
      control('name'),
      { name: 'Jo Rivers' },
      { readonly: true },
    );

    const input = container.querySelector('input');
    expect(input).toHaveAttribute('readonly');
    expect(input).not.toBeDisabled();
    expect(container.querySelector('[data-slot="plain-field"]')).toBeNull();
  });
});

describe('display elements are untouched (rule 13)', () => {
  it('renders a Heading and a Separator identically in all three presentations', () => {
    const schema = schemaOf({ name: { type: 'string' } });
    const elements = [
      { type: 'Heading', text: 'Your details' },
      { type: 'Separator' },
    ] as unknown as UISchemaElement[];

    for (const element of elements) {
      const fill = renderPlain(schema, element, {}, FILL).container.innerHTML;
      const readonly = renderPlain(schema, element, {}, { readonly: true }).container.innerHTML;
      const plain = renderPlain(schema, element, {}).container.innerHTML;

      // Not vacuous: a display element renders SOMETHING, and the same something three times.
      expect(fill).not.toBe('');
      expect(readonly).toBe(fill);
      expect(plain).toBe(fill);
    }
  });
});
