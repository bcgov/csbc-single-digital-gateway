import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as studio from '../src/renderers-studio';
import {
  FORM_DESCRIPTION_PLACEHOLDER,
  FORM_TITLE_PLACEHOLDER,
} from '../src/renderers/gridstack/form-renderer';
import { FormRunner } from '../src/runner/form-runner';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { inspectorContext } from '../src/studio/inspector/inspector-context';
import { INSPECTOR_FIELDS } from '../src/studio/inspector/inspector-fields';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import { el } from './inspector-fixtures';

// Doc 201 rules 7b and 20 — the studio canvas title's inset and grey, and a Form's `options.description`.

const schema: JsonSchema = { type: 'object', properties: { name: { type: 'string' } } };
const form = (extra: object = {}) =>
  el({ type: 'Form', elements: [{ type: 'Heading', text: 'Body' }], ...extra });

async function renderStudioSet(uischema: UISchemaElement) {
  const view = render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={{}}
      renderers={[
        ...studio.controlRenderers,
        ...studio.displayRenderers,
        ...studio.layoutRenderers,
      ]}
      cells={studio.cells}
    />,
  );
  await screen.findByText('Body');
  await act(async () => {});
  return view;
}

/** The terms of a `calc()` sum, sorted: jsdom normalises their order. */
const calcTerms = (value: string | undefined) =>
  (value ?? '')
    .replace(/^calc\((.*)\)$/, '$1')
    .split(' + ')
    .sort();

const descriptionField = INSPECTOR_FIELDS.find((field) => field.key === 'formDescription');
function contextFor(element: UISchemaElement) {
  const ids = createElementIds();
  const ctx = inspectorContext({ schema, uischema: element }, ids.idOf(element), ids);
  if (!ctx) throw new Error('no inspector context');
  return ctx;
}

describe('studio canvas title (rule 7b)', () => {
  it('looks disabled, like the studio fields: the block at half opacity, the title its normal colour', async () => {
    const { container } = await renderStudioSet(form({ label: 'Permit' }));
    // Not text-selectable either, like a disabled field's label.
    expect(container.querySelector('[data-slot="form-title-block"]')).toHaveClass(
      'opacity-50',
      'select-none',
    );
    expect(container.querySelector('[data-slot="form-title"]')).not.toHaveClass(
      'text-muted-foreground',
    );
  });

  it('insets the title block exactly as far as an element’s content, from the Form’s own gap', async () => {
    const { container } = await renderStudioSet(form({ label: 'Permit' }));
    const block = container.querySelector<HTMLElement>('[data-slot="form-title-block"]');
    // Default `md` gap: 1rem / 2 margin + 1px frame border + 0.5rem frame padding.
    expect(calcTerms(block?.style.paddingInline)).toEqual(['0.5rem', '0.5rem', '1px']);
  });

  it('widens the inset with a wider Form gap', async () => {
    const { container } = await renderStudioSet(form({ label: 'Permit', options: { gap: 'xl' } }));
    expect(
      calcTerms(
        container.querySelector<HTMLElement>('[data-slot="form-title-block"]')?.style.paddingInline,
      ),
    ).toEqual(['0.5rem', '1px', '1rem']);
  });
});

describe('Form description (rule 20)', () => {
  it('renders under the title in the same inset block, greyed', async () => {
    const { container } = await renderStudioSet(
      form({ label: 'Permit', options: { description: 'Tell us about the work.' } }),
    );
    const block = container.querySelector('[data-slot="form-title-block"]');
    const description = block?.querySelector('[data-slot="form-description"]');
    expect(description).toHaveTextContent('Tell us about the work.');
    // Muted like a field description, and faded with the block.
    expect(description).toHaveClass('text-muted-foreground');
    expect(block).toHaveClass('opacity-50');
    // Under the title: the heading comes first in the block.
    expect(block?.firstElementChild).toHaveAttribute('data-slot', 'form-title');
  });

  it('shows a placeholder on the canvas for an absent or blank description (rule 22)', async () => {
    const { container } = await renderStudioSet(
      form({ label: 'Permit', options: { description: '   ' } }),
    );
    expect(container.querySelector('[data-slot="form-description"]')).toBeNull();
    expect(container.querySelector('[data-slot="form-description-placeholder"]')).toHaveTextContent(
      FORM_DESCRIPTION_PLACEHOLDER,
    );
  });

  it('offers the same placeholders in the inspector, and never writes them (rule 22)', () => {
    const root = form({ label: 'Permit' });
    const ctx = contextFor(root);
    expect(descriptionField?.options?.(ctx)).toMatchObject({
      placeholder: FORM_DESCRIPTION_PLACEHOLDER,
    });
    const titleField = INSPECTOR_FIELDS.find((field) => field.key === 'label');
    expect(titleField?.options?.(ctx)).toEqual({ placeholder: FORM_TITLE_PLACEHOLDER });
    // A placeholder is never authored: the element has no options at all until something is typed.
    expect(root.options).toBeUndefined();
  });

  it('is set from the inspector into options.description, and cleared by emptying it', () => {
    const root = form({ label: 'Permit' });
    const ctx = contextFor(root);
    expect(descriptionField?.applies(ctx)).toBe(true);

    const written = descriptionField?.write(
      ctx,
      { element: root as TreeElement, schema },
      'Tell us about the work.',
    );
    expect(written?.element.options).toEqual({ description: 'Tell us about the work.' });

    const cleared = descriptionField?.write(
      contextFor(written?.element as UISchemaElement),
      { element: written?.element as TreeElement, schema },
      '',
    );
    expect(cleared?.element.options).toBeUndefined();
  });

  it('does not apply to anything but a Form', () => {
    const layout = el({ type: 'VerticalLayout', elements: [] });
    const root = el({ type: 'Form', label: 'Root', elements: [layout] });
    const ids = createElementIds();
    const ctx = inspectorContext({ schema, uischema: root }, ids.idOf(layout), ids);
    expect(ctx && descriptionField?.applies(ctx)).toBe(false);
  });

  it('is accepted by the uischema metaschema, and a non-string is refused', () => {
    const ajv = createAjv();
    const ok = (value: object) => ajv.validate(UISCHEMA_METASCHEMA, value) === true;
    expect(
      ok({ type: 'Form', label: 'Permit', elements: [], options: { description: 'Hi' } }),
    ).toBe(true);
    expect(ok({ type: 'Form', label: 'Permit', elements: [], options: { description: 3 } })).toBe(
      false,
    );
  });
});

describe('Form description in the runner (rule 20b)', () => {
  const renderRunner = (uischema: UISchemaElement) =>
    render(<FormRunner schema={schema} uischema={uischema} data={{}} onChange={() => {}} />);

  it('shows under the title, inside the gold-ruled bar, for a Form document', async () => {
    const { container } = renderRunner(
      form({ label: 'Permit', options: { description: 'Tell us about the work.' } }),
    );
    await screen.findByText('Body');
    const bar = container.querySelector('[data-slot="form-title-bar"]');
    const description = bar?.querySelector('[data-slot="form-description"]');
    expect(description).toHaveTextContent('Tell us about the work.');
    expect(description).toHaveClass('text-muted-foreground', 'px-6', 'pb-6');
    // The heading gives its bottom padding to the description, so the pair keeps the title's p-6 frame.
    expect(bar?.querySelector('[data-slot="form-title"]')).toHaveClass('px-6', 'pt-6', 'pb-2');
    expect(bar?.firstElementChild).toHaveAttribute('data-slot', 'form-title');
  });

  it('renders no description placeholder for a citizen — the runner shows only what is authored', async () => {
    const { container } = renderRunner(form({ label: 'Permit' }));
    await screen.findByText('Body');
    expect(container.querySelector('[data-slot="form-description-placeholder"]')).toBeNull();
  });

  it('keeps the title at p-6 when there is no description', async () => {
    const { container } = renderRunner(form({ label: 'Permit' }));
    await screen.findByText('Body');
    expect(container.querySelector('[data-slot="form-title"]')).toHaveClass('p-6');
    expect(container.querySelector('[data-slot="form-description"]')).toBeNull();
  });

  it("shows the current page's description in a multi-stage form", async () => {
    const flow = el({
      type: 'Flow',
      elements: [
        {
          type: 'Stage',
          label: 'One',
          options: { id: 's1' },
          elements: [
            {
              type: 'Form',
              label: 'Contact',
              options: { id: 'f1', description: 'How we reach you.' },
              elements: [{ type: 'Heading', text: 'Body' }],
            },
          ],
        },
      ],
    });
    renderRunner(flow);
    expect(await screen.findByText('How we reach you.')).toHaveAttribute(
      'data-slot',
      'form-description',
    );
  });
});
