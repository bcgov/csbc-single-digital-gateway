import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { emptyRichText, richText } from './rich-text-fixtures';
import * as studio from '../src/renderers-studio';
import {
  FORM_DESCRIPTION_PLACEHOLDER,
  FORM_TITLE_PLACEHOLDER,
} from '../src/renderers/gridstack/form-renderer';
import * as studioVisibility from '../src/renderers/gridstack/form-renderer';
import { FormRunner } from '../src/runner/form-runner';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { inspectorContext } from '../src/studio/inspector/inspector-context';
import { INSPECTOR_FIELDS } from '../src/studio/inspector/inspector-fields';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import { el } from './inspector-fixtures';

// Doc 201 rules 7b and 20 — the studio canvas title's inset and grey, and a Form's `options.description`.
//
// Doc 207 rules 30-32 SUPERSEDE rule 20's type: the description is RICH content (a Lexical editor state),
// not a string, and the apply gate now REFUSES a plain string rather than accepting one that renders
// nothing. The assertions below are converted; what they check is unchanged.

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
  it('looks disabled, like the studio fields: each area at half opacity, the title its normal colour', async () => {
    const { container } = await renderStudioSet(form({ label: 'Permit' }));
    // Not text-selectable either, like a disabled field's label.
    expect(container.querySelector('[data-slot="form-title-block"]')).toHaveClass('select-none');
    // Doc 223 rule 11: the half opacity moved from the BLOCK down to each area, so one area can draw
    // at full strength while the other stays dim — an ancestor's opacity cannot be undone below it.
    const title = container.querySelector('[data-slot="form-title"]');
    expect(title?.closest('.opacity-50')).not.toBeNull();
    expect(title).not.toHaveClass('text-muted-foreground');
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
      form({ label: 'Permit', options: { description: richText('Tell us about the work.') } }),
    );
    const block = container.querySelector('[data-slot="form-title-block"]');
    const description = block?.querySelector('[data-slot="form-description"]');
    expect(description).toHaveTextContent('Tell us about the work.');
    // Doc 223 rule 11: muted like a field description and faded — both now on the AREA that wraps it,
    // so engaging the description can bring it to full colour without touching the title.
    const area = description?.closest('.opacity-50');
    expect(area).toHaveClass('text-muted-foreground');
    expect(area).toHaveClass('hover:text-foreground');
    // Under the title: the title's area comes first in the block.
    expect(block?.firstElementChild?.querySelector('[data-slot="form-title"]')).not.toBeNull();
  });

  it('shows a placeholder on the canvas for an absent or blank description (rule 22)', async () => {
    const { container } = await renderStudioSet(
      // A plain STRING no longer renders (doc 207 rule 30), so it shows the placeholder too.
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

    // Doc 207 rule 30: the value is an editor state now, not a string.
    const state = richText('Tell us about the work.');
    const written = descriptionField?.write(ctx, { element: root as TreeElement, schema }, state);
    expect(written?.element.options).toEqual({ description: state });

    // Rule 5: an editor with no TEXT clears the key — the value is still an object, so a presence check
    // would leave a description behind that renders nothing.
    const cleared = descriptionField?.write(
      contextFor(written?.element as UISchemaElement),
      { element: written?.element as TreeElement, schema },
      emptyRichText(),
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

  it('is accepted by the uischema metaschema as RICH content; a string and a number are refused', () => {
    // Doc 207 rule 32: the gate refuses a plain string on purpose. Accepting both would let an author save
    // a description that renders nothing, which is worse than refusing it outright.
    const ajv = createAjv();
    const ok = (value: object) => ajv.validate(UISCHEMA_METASCHEMA, value) === true;
    const formWith = (description: unknown) =>
      ({ type: 'Form', label: 'Permit', elements: [], options: { description } }) as object;
    expect(ok(formWith(richText('Hi')))).toBe(true);
    expect(ok(formWith('Hi'))).toBe(false);
    expect(ok(formWith(3))).toBe(false);
    expect(ok(formWith({ nope: 1 }))).toBe(false);
  });
});

describe('Form description in the runner (rule 20b)', () => {
  const renderRunner = (uischema: UISchemaElement) =>
    render(<FormRunner schema={schema} uischema={uischema} data={{}} onChange={() => {}} />);

  it('shows under the title, inside the gold-ruled bar, for a Form document', async () => {
    const { container } = renderRunner(
      form({ label: 'Permit', options: { description: richText('Tell us about the work.') } }),
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
          id: 's1',
          elements: [
            {
              type: 'Form',
              label: 'Contact',
              id: 'f1',
              options: { description: richText('How we reach you.') },
              elements: [{ type: 'Heading', text: 'Body' }],
            },
          ],
        },
      ],
    });
    const { container } = renderRunner(flow);
    // Doc 207: the slot is now the WRAPPER; RichTextView renders the text in its own paragraph inside it.
    const text = await screen.findByText('How we reach you.');
    expect(container.querySelector('[data-slot="form-description"]')).toContainElement(text);
  });
});

describe('Show title / Show description (doc 201 rules 23-24)', () => {
  const titleOnCanvas = () =>
    document.querySelector('[data-slot="form-title"], [data-slot="form-title-placeholder"]');
  const descriptionOnCanvas = () =>
    document.querySelector(
      '[data-slot="form-description"], [data-slot="form-description-placeholder"]',
    );
  const fieldsFor = (element: TreeElement) => {
    const ids = createElementIds();
    const ctx = inspectorContext({ schema, uischema: element }, ids.idOf(element), ids);
    return INSPECTOR_FIELDS.filter((f) => ctx && f.applies(ctx)).map((f) => f.key);
  };

  it('are absent from a document that shows both', () => {
    // Absent means shown, so nothing needs migrating and a plain document stays plain.
    const { showsTitle, showsDescription } = studioVisibility;
    expect(showsTitle(form())).toBe(true);
    expect(showsDescription(form())).toBe(true);
  });

  it('read an explicit false as hidden, and anything else as shown', () => {
    const { showsTitle, showsDescription } = studioVisibility;
    expect(showsTitle(form({ options: { showTitle: false } }))).toBe(false);
    expect(showsDescription(form({ options: { showDescription: false } }))).toBe(false);
    // Only `false` hides: a truthy or junk value is not a hide instruction.
    expect(showsTitle(form({ options: { showTitle: true } }))).toBe(true);
    expect(showsTitle(form({ options: { showTitle: 'no' } }))).toBe(true);
  });

  it('hide the title on the studio canvas without clearing it', async () => {
    const uischema = form({ label: 'Permit', options: { showTitle: false } });
    await renderStudioSet(uischema);
    expect(titleOnCanvas()).toBeNull();
    // The value is untouched, so the inspector still offers it and turning the toggle back on restores it.
    expect((uischema as { label?: unknown }).label).toBe('Permit');
    expect(fieldsFor(uischema as TreeElement)).toContain('label');
  });

  it('hide the description on the studio canvas, independently of the title', async () => {
    await renderStudioSet(
      form({
        label: 'Permit',
        options: { description: richText('Guidance'), showDescription: false },
      }),
    );
    expect(descriptionOnCanvas()).toBeNull();
    expect(titleOnCanvas()).not.toBeNull();
  });

  it('hide them in the FILLABLE form too — the point of authoring it', () => {
    const uischema = form({
      label: 'Permit',
      options: { description: richText('Guidance'), showTitle: false, showDescription: false },
    }) as UISchemaElement;
    render(<FormRunner schema={schema} uischema={uischema} data={{}} onChange={() => {}} />);
    expect(document.querySelector('[data-slot="form-title"]')).toBeNull();
    expect(document.querySelector('[data-slot="form-description"]')).toBeNull();
    // Both hidden reads exactly like an untitled form: the bar goes, the top space stays.
    expect(document.querySelector('[data-slot="form-title-space"]')).not.toBeNull();
  });

  it('are accepted by the apply gate on a Form and on a Service', () => {
    const ajv = createAjv();
    for (const type of ['Form', 'Service'])
      expect(
        ajv.validate(UISCHEMA_METASCHEMA, {
          type,
          elements: [],
          options: { showTitle: false, showDescription: false },
        }),
        type,
      ).toBe(true);
  });
});
