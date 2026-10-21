import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as ui from '../src/renderers-ui';
import * as inspectorSet from '../src/renderers/studio-inspector/index';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { validateUischemaDocument } from '../src/studio/code/validate-document';
import { PALETTE_TEMPLATES, buildTemplate } from '../src/studio/palette/palette-templates';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { inspectorForm } from '../src/studio/inspector/inspector-form';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import { emptyRichText, richText } from './rich-text-fixtures';
import { richTextConfig } from '../src/renderers/ui/rich-text-options';

// Doc 207 rules 17-23 — the RichContent DISPLAY element: authored content that collects nothing.

const renderers = [...ui.controlRenderers, ...ui.displayRenderers, ...ui.layoutRenderers];
const schema = { type: 'object', properties: {} } as JsonSchema;

const element = (content?: unknown): UISchemaElement =>
  ({ type: 'RichContent', ...(content === undefined ? {} : { content }) }) as UISchemaElement;

const renderElement = (uischema: UISchemaElement) =>
  render(<JsonForms schema={schema} uischema={uischema} data={{}} renderers={renderers} />);

describe('rendering (rules 17-19)', () => {
  it('renders its authored content', () => {
    renderElement(element(richText('A paragraph of guidance')));
    expect(screen.getByText('A paragraph of guidance')).toBeInTheDocument();
  });

  it('reads content from the TOP LEVEL, not from options', () => {
    renderElement({ type: 'RichContent', options: { content: richText('Wrong place') } } as never);
    expect(screen.queryByText('Wrong place')).toBeNull();
  });

  it('collects nothing — it offers no editable surface', () => {
    renderElement(element(richText('Guidance')));
    // The VIEW renders a non-editable ContentEditable, which still carries role="textbox" — so the proof
    // is that nothing is EDITABLE and no real form control rendered.
    expect(document.querySelector('[contenteditable="true"]')).toBeNull();
    expect(document.querySelector('input, textarea')).toBeNull();
  });

  it('renders nothing for absent or malformed content in a fillable form (rule 23)', () => {
    const { container } = renderElement(element());
    expect(container).toHaveTextContent('');
    expect(() => renderElement(element({ nope: 1 }))).not.toThrow();
  });
});

describe('registration (rule 20)', () => {
  it('is in the ui display set, and reaches default and studio', async () => {
    const [def, studio] = await Promise.all([
      import('../src/renderers-default'),
      import('../src/renderers-studio'),
    ]);
    expect(ui.displayRenderers.length).toBe(3);
    expect(def.displayRenderers.length).toBe(ui.displayRenderers.length);
    expect(studio.displayRenderers.length).toBeGreaterThanOrEqual(ui.displayRenderers.length);
  });

  it('stays OUT of the inspector display set, which edits through a control (rule 22)', () => {
    expect(inspectorSet.displayRenderers).toEqual([]);
  });

  it('has a palette template in the display group', () => {
    const template = PALETTE_TEMPLATES.find((entry) => entry.key === 'rich-content');
    expect(template).toMatchObject({ group: 'display' });
    expect(buildTemplate('rich-content', schema)?.element).toMatchObject({ type: 'RichContent' });
  });

  it('binds to no data — its template has no property', () => {
    expect(buildTemplate('rich-content', schema)?.property).toBeUndefined();
  });
});

describe('the metaschema (rule 20)', () => {
  const document = (elements: object[]) =>
    ({ type: 'Form', label: 'A form', elements }) as unknown as UISchemaElement;

  it('lists RichContent in the element type enum', () => {
    expect(JSON.stringify(UISCHEMA_METASCHEMA)).toContain('RichContent');
  });

  it('accepts a RichContent element at the apply gate', () => {
    expect(validateUischemaDocument(document([element(richText())])).valid).toBe(true);
  });

  it('accepts one with no content yet', () => {
    expect(validateUischemaDocument(document([element()])).valid).toBe(true);
  });

  it('still refuses an element type that does not exist', () => {
    expect(validateUischemaDocument(document([{ type: 'RichNonsense' }])).valid).toBe(false);
  });

  it('refuses content that is not an object', () => {
    expect(validateUischemaDocument(document([element('plain text')])).valid).toBe(false);
  });
});

describe('authoring it in the inspector (rule 21)', () => {
  const ids = createElementIds();
  const docFor = (content?: unknown) => {
    const uischema = {
      type: 'Form',
      label: 'A form',
      elements: [element(content)],
    } as unknown as TreeElement;
    return { schema, uischema };
  };

  it('offers a Content field that dispatches the rich text control', () => {
    const document = docFor(richText('Guidance'));
    const child = (document.uischema.elements ?? [])[0] as TreeElement;
    const form = inspectorForm(document, ids.idOf(child), ids);
    const field = form?.schema.properties?.['content'];
    // The rich text control claims it because the FIELD SCHEMA is a rich text property (rule 1).
    expect(field).toMatchObject({ type: 'object', required: ['root'] });
    expect(form?.data['content']).toBeDefined();
  });

  it('writes the content back onto the element', () => {
    const document = docFor();
    const child = (document.uischema.elements ?? [])[0] as TreeElement;
    const id = ids.idOf(child);
    const next = applyInspector(document, id, { content: richText('Written') }, ids);
    const written = (next.uischema as TreeElement).elements?.[0] as { content?: unknown };
    expect(written.content).toBeDefined();
  });

  it('clears the key for an editor with no text (rule 5)', () => {
    const document = docFor(richText('Guidance'));
    const child = (document.uischema.elements ?? [])[0] as TreeElement;
    const id = ids.idOf(child);
    const next = applyInspector(document, id, { content: emptyRichText() }, ids);
    const written = (next.uischema as TreeElement).elements?.[0] as { content?: unknown };
    expect(written.content).toBeUndefined();
  });
});

describe('the block’s placeholder (doc 207 rules 36-37)', () => {
  it('sanitises an authored placeholder with the control’s own rule', () => {
    // One definition of what a placeholder is — a non-empty string — shared with the rich text FIELD,
    // so a blank or wrong-typed one falls back identically on both.
    expect(richTextConfig({ placeholder: 'Enter the terms' }).placeholder).toBe('Enter the terms');
    for (const bad of [{ placeholder: '' }, { placeholder: 7 }, {}, undefined])
      expect(richTextConfig(bad).placeholder).toBeUndefined();
  });

  it('renders NOTHING for an empty block outside the studio', () => {
    // The placeholder is authoring guidance. A citizen's form must still render nothing — the empty
    // state lives in the studio's inline editor, which is not mounted here at all.
    const { container } = renderElement(element());
    expect(container.textContent).toBe('');
  });
});
