import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as studio from '../src/renderers-studio';
import * as ui from '../src/renderers-ui';
import { RichTextControlRenderer } from '../src/renderers/ui/rich-text-renderer';
import { isRichTextControl, isRichTextProperty } from '../src/renderers/ui/rich-text-value';
import { PALETTE_TEMPLATES, buildTemplate } from '../src/studio/palette/palette-templates';
import { richText, richTextProperty } from './rich-text-fixtures';

// Doc 207 rules 1-2, 6-14 — the rich text CONTROL: how it is dispatched, and that Input/Textarea can never
// claim it.

const renderers = [...ui.controlRenderers, ...ui.displayRenderers, ...ui.layoutRenderers];
const testerContext = { rootSchema: {} as JsonSchema, config: {} };

const schema = {
  type: 'object',
  properties: {
    background: richTextProperty(),
    note: { type: 'string', title: 'Note' },
  },
} as JsonSchema;

const control = (options?: object): UISchemaElement =>
  ({
    type: 'Control',
    scope: '#/properties/background',
    ...(options === undefined ? {} : { options }),
  }) as UISchemaElement;

const renderControl = (uischema: UISchemaElement, data: object = {}) =>
  render(<JsonForms schema={schema} uischema={uischema} data={data} renderers={renderers} />);

// The VIEW renders a ContentEditable too (`contenteditable="false"`), so the editor is the editable one.
const editor = () => document.querySelector<HTMLElement>('[contenteditable="true"]');

describe('dispatch (rules 1-2, 6)', () => {
  it('claims a rich text property', () => {
    expect(isRichTextControl(control(), schema, testerContext)).toBe(true);
  });

  it('does NOT claim a plain string property', () => {
    const note = { type: 'Control', scope: '#/properties/note' } as UISchemaElement;
    expect(isRichTextControl(note, schema, testerContext)).toBe(false);
  });

  it('wins, and the string controls never contend', () => {
    renderControl(control());
    expect(editor()).toBeInTheDocument();
    // Rule 6: `isStringControl` cannot match an object, so there is nothing to out-rank. Lexical gives the
    // ContentEditable role="textbox", so the proof is that no real <input>/<textarea> rendered.
    expect(document.querySelector('input, textarea')).toBeNull();
  });

  it('is NOT reachable by asking for a textarea — the option cannot override the schema', () => {
    renderControl(control({ component: 'textarea' }));
    expect(editor()).toBeInTheDocument();
  });

  it('renders the editor exactly once', () => {
    renderControl(control());
    expect(document.querySelectorAll('[contenteditable="true"]')).toHaveLength(1);
  });
});

describe('the field wrapper (rules 7-8)', () => {
  it('shows the label from the schema title', () => {
    renderControl(control());
    expect(screen.getByText(/Background/)).toBeInTheDocument();
  });

  it('names the editor through aria-labelledby, since a label cannot name a div', () => {
    renderControl(control());
    const labelledBy = editor()?.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).toHaveTextContent(/Background/);
  });

  it('links the description through aria-describedby', () => {
    const described = {
      ...schema,
      properties: {
        ...schema.properties,
        background: { ...richTextProperty(), description: 'Anything relevant' },
      },
    } as JsonSchema;
    render(<JsonForms schema={described} uischema={control()} data={{}} renderers={renderers} />);
    const describedBy = editor()?.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(screen.getByText('Anything relevant')).toBeInTheDocument();
  });

  it('marks a required field invalid when it holds no text (rule 5)', () => {
    const required = { ...schema, required: ['background'] } as JsonSchema;
    render(
      <JsonForms
        schema={required}
        uischema={control()}
        data={{}}
        renderers={renderers}
        validationMode="ValidateAndShow"
      />,
    );
    expect(editor()).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('authored options (rules 11-14)', () => {
  it('limits the toolbar to the named features', () => {
    renderControl(control({ toolbar: ['bold'] }));
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Link' })).toBeNull();
  });

  it('shows an authored placeholder', () => {
    renderControl(control({ placeholder: 'Describe the situation' }));
    expect(screen.getByText('Describe the situation')).toBeInTheDocument();
  });

  it('renders the VIEW, not the editor, when readOnly is authored', () => {
    renderControl(control({ readOnly: true }), { background: richText('Read me') });
    expect(screen.getByText('Read me')).toBeInTheDocument();
    expect(editor()).toBeNull();
  });

  it('renders the view when the FORM is read-only, whatever the option says', () => {
    render(
      <JsonForms
        schema={schema}
        uischema={control({ readOnly: false })}
        data={{ background: richText('Read me') }}
        renderers={renderers}
        readonly
      />,
    );
    expect(editor()).toBeNull();
  });

  it('ignores a malformed toolbar rather than failing to render', () => {
    renderControl(control({ toolbar: 'bold' }));
    expect(editor()).toBeInTheDocument();
  });
});

describe('the value (rules 3-4, 9)', () => {
  it('shows stored content', () => {
    renderControl(control(), { background: richText('Stored words') });
    expect(screen.getByText('Stored words')).toBeInTheDocument();
  });

  it('starts empty for a malformed stored value rather than crashing', () => {
    // Rule 4: the code panel can author this, and it crashes RichTextInput without the guard.
    expect(() => renderControl(control(), { background: { nope: 1 } })).not.toThrow();
    expect(editor()).toBeInTheDocument();
  });

  it('starts empty for a value of the wrong type entirely', () => {
    expect(() => renderControl(control(), { background: 'plain string' })).not.toThrow();
  });
});

describe('the renderer set', () => {
  it('is exported from renderers/ui and reaches default and studio', async () => {
    // NOT named `studio`: that would shadow the module import above, the trap doc 200 records.
    const [defaultSet, studioSet] = await Promise.all([
      import('../src/renderers-default'),
      import('../src/renderers-studio'),
    ]);
    expect(ui.controlRenderers.some((entry) => entry.renderer === RichTextControlRenderer)).toBe(
      true,
    );
    // studio wraps every entry in the studio frame, so identity does not survive there — count instead.
    expect(defaultSet.controlRenderers.length).toBe(ui.controlRenderers.length);
    expect(studioSet.controlRenderers.length).toBeGreaterThanOrEqual(ui.controlRenderers.length);
  });
});

describe('the palette template (rules 1, 6)', () => {
  it('offers a Rich text FIELD whose property carries both signals', () => {
    const template = PALETTE_TEMPLATES.find((entry) => entry.key === 'rich-text');
    expect(template).toMatchObject({ group: 'fields', label: 'Rich text' });
    const built = buildTemplate('rich-text', { type: 'object', properties: {} });
    expect(built?.property).toMatchObject({ type: 'object', required: ['root'] });
    // No `options.component`: the kind comes from the schema, never from an authored flag.
    expect(built?.element).toEqual({ type: 'Control' });
  });

  it('builds a property the rich text control actually claims', () => {
    const built = buildTemplate('rich-text', { type: 'object', properties: {} });
    expect(isRichTextProperty(built?.property)).toBe(true);
  });
});

describe('disabled is not read-only (rule 14)', () => {
  // The STUDIO set is the real path: `withStudioFrame` renders each control with `enabled={false}`.
  // (`<JsonForms>` has no `enabled` prop — only `readonly` — so disabling cannot be driven from there.)
  const renderStudio = (uischema: UISchemaElement, data: object = {}) =>
    render(
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={data}
        renderers={[
          ...studio.controlRenderers,
          ...studio.displayRenderers,
          ...studio.layoutRenderers,
        ]}
      />,
    );

  it('still draws the editor chrome on the studio canvas', () => {
    // Showing the read-only VIEW here meant an EMPTY field rendered its label and nothing else — the
    // author could not see the field they had just added. Found by hand; invisible to every test above.
    renderStudio(control());
    expect(document.querySelector('[contenteditable]')).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: /formatting/i })).toBeInTheDocument();
  });

  it('makes that editor non-editable', async () => {
    renderStudio(control());
    // `EditablePlugin` syncs Lexical's editable flag in an effect, so the attribute settles after mount.
    await waitFor(() => expect(document.querySelector('[contenteditable="true"]')).toBeNull());
  });

  it('shows the VIEW, not the editor, when the form is read-only', () => {
    render(
      <JsonForms
        schema={schema}
        uischema={control()}
        data={{ background: richText('Read me') }}
        renderers={renderers}
        readonly
      />,
    );
    expect(screen.getByText('Read me')).toBeInTheDocument();
    expect(document.querySelector('[contenteditable="true"]')).toBeNull();
  });
});
