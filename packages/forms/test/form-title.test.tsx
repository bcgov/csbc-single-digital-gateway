import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers-default';
import * as studio from '../src/renderers-studio';
import { labelOf } from '../src/renderers/gridstack/element-label';
import {
  FORM_TITLE_PLACEHOLDER,
  NESTED_FORM_MESSAGE,
} from '../src/renderers/gridstack/form-renderer';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { documentFor, UNTITLED_FORM } from '../src/studio/document/document-source';
import { FLOW_TEMPLATE_UISCHEMA } from '../src/studio/document/flow-sample';
import { inspectorContext } from '../src/studio/inspector/inspector-context';
import { INSPECTOR_FIELDS } from '../src/studio/inspector/inspector-fields';
import { createElementIds } from '../src/studio/layout/element-ids';
import { STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';
import { el, fieldSchema, formFor, type Node } from './inspector-fixtures';

// Doc 201 — the Form title: a Form's `uischema.label` rendered above its children, plainly on the studio canvas and
// gold-ruled in fillable forms, and made an expected value in the inspector and the code editor's metaschema.

const schema: JsonSchema = { type: 'object', properties: { name: { type: 'string' } } };

type Set = typeof defaults;

const heading = (text: string) => ({ type: 'Heading', text });
const form = (extra: object = {}) => el({ type: 'Form', elements: [heading('Body')], ...extra });

const renderersOf = (set: Set) => [
  ...set.controlRenderers,
  ...set.displayRenderers,
  ...set.layoutRenderers,
];

function renderWith(set: Set, uischema: UISchemaElement, data: object = {}) {
  return render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={renderersOf(set)}
      cells={set.cells}
    />,
  );
}

async function settle(text: string) {
  await screen.findByText(text);
  await act(async () => {});
}

const TITLE = '[data-slot="form-title"]';
const TITLE_BAR = '[data-slot="form-title-bar"]';
const PLACEHOLDER = '[data-slot="form-title-placeholder"]';
const FILL_LAYOUT = '[data-slot="fill-layout"]';

const DOCUMENT_POSITION_FOLLOWING = 4;
/** True when `first` comes before `second` in document order. */
const precedes = (first: Element, second: Element) =>
  (first.compareDocumentPosition(second) & DOCUMENT_POSITION_FOLLOWING) !== 0;

const ajv = createAjv();
const uischemaOk = (value: unknown) => ajv.validate(UISCHEMA_METASCHEMA, value) === true;

/** A Flow whose single Stage holds `formEl` — the shared `#/definitions/form` reached through the Flow half. */
const stageOf = (formEl: object) => ({
  type: 'Flow',
  elements: [{ type: 'Stage', elements: [formEl], options: { id: 's1' } }],
});

/** The inspector's `label` field, and a context for `element` inside `uischema`. */
const labelField = INSPECTOR_FIELDS.find((field) => field.key === 'label');
function contextFor(element: UISchemaElement, uischema: UISchemaElement) {
  const ids = createElementIds();
  const ctx = inspectorContext({ schema, uischema }, ids.idOf(element), ids);
  if (!ctx) throw new Error('no inspector context');
  return ctx;
}

describe('Form title (doc 201)', () => {
  describe('labelOf — the shared read (rule 1)', () => {
    it('returns the trimmed label when it is a non-empty string', () => {
      expect(labelOf(el({ type: 'Form', label: 'Apply for a permit' }), 'x')).toBe(
        'Apply for a permit',
      );
      expect(labelOf(el({ type: 'Form', label: '  Padded  ' }), 'x')).toBe('Padded');
    });

    it('returns the fallback for an absent, non-string, empty or whitespace-only label', () => {
      expect(labelOf(el({ type: 'Form' }), 'fallback')).toBe('fallback');
      expect(labelOf(el({ type: 'Form', label: '' }), 'fallback')).toBe('fallback');
      expect(labelOf(el({ type: 'Form', label: '   ' }), 'fallback')).toBe('fallback');
      expect(labelOf(el({ type: 'Form', label: 42 }), 'fallback')).toBe('fallback');
      expect(labelOf(el({ type: 'Form', label: false }), 'fallback')).toBe('fallback');
    });

    it('is the same helper the Stage card reads its Form rows with (rule 20)', () => {
      const source = readFileSync(
        resolve(import.meta.dirname, '../src/renderers/xyflow/stage-renderer.tsx'),
        'utf8',
      );
      expect(source).toContain("from '../gridstack/element-label'");
      // The private copy is gone, so the trim/fallback rule cannot diverge.
      expect(source).not.toMatch(/^\s*function labelOf/m);
    });
  });

  describe('rendering position (rules 2, 3)', () => {
    it('renders the title before the child elements in the fillable set', async () => {
      const { container } = renderWith(defaults, form({ label: 'Permit application' }));
      await settle('Body');
      const title = container.querySelector(TITLE);
      const layout = container.querySelector(FILL_LAYOUT);
      expect(title).toHaveTextContent('Permit application');
      expect(precedes(title as Element, layout as Element)).toBe(true);
    });

    it('renders the title before the child elements in the studio set', async () => {
      const { container } = renderWith(studio, form({ label: 'Permit application' }));
      await settle('Body');
      const title = container.querySelector(TITLE);
      const grid = container.querySelector('.grid-stack');
      expect(title).toHaveTextContent('Permit application');
      expect(precedes(title as Element, grid as Element)).toBe(true);
    });

    it('reads uischema.label, not a translated label prop', async () => {
      // A layout receives no translated `label` prop, so a title can only come from the element itself.
      const { container } = renderWith(defaults, form({ label: '  Trimmed title  ' }));
      await settle('Body');
      expect(container.querySelector(TITLE)).toHaveTextContent('Trimmed title');
    });

    it('renders no title for a nested Form, which still shows only the placement error', async () => {
      const { container } = renderWith(
        defaults,
        el({
          type: 'VerticalLayout',
          elements: [heading('Outer'), form({ label: 'Nested title' })],
        }),
      );
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(NESTED_FORM_MESSAGE);
      expect(container.querySelector(TITLE)).toBeNull();
      expect(screen.queryByText('Nested title')).toBeNull();
    });
  });

  describe('amended Form DOM (rules 4, 5)', () => {
    it('still renders no <form> element', async () => {
      const { container } = renderWith(defaults, form({ label: 'Titled' }));
      await settle('Body');
      expect(container.querySelector('form')).toBeNull();
    });

    it("renders a VerticalLayout's DOM preceded by the title, and nothing else new", async () => {
      const titled = renderWith(defaults, form({ label: 'Titled' }));
      await settle('Body');
      const layout = titled.container.querySelector(FILL_LAYOUT);
      expect(layout).toHaveAttribute('data-layout-type', 'Form');
      expect(layout).toHaveClass('flex', 'flex-col');
      titled.unmount();

      // The layout half is still exactly a VerticalLayout's.
      const stack = renderWith(
        defaults,
        el({ type: 'VerticalLayout', elements: [heading('Body')] }),
      );
      await settle('Body');
      expect(stack.container.querySelector(FILL_LAYOUT)).toHaveClass('flex', 'flex-col');
      expect(stack.container.querySelector(TITLE)).toBeNull();
    });

    it('renders neither title nor children when the Form is hidden by its rule', async () => {
      const { container } = renderWith(
        defaults,
        form({
          label: 'Hidden title',
          rule: {
            effect: 'HIDE',
            condition: { scope: '#/properties/name', schema: { const: 'hide' } },
          },
        }),
        { name: 'hide' },
      );
      await act(async () => {});
      expect(container.querySelector(TITLE)).toBeNull();
      expect(container.querySelector(FILL_LAYOUT)).toBeNull();
      expect(screen.queryByText('Hidden title')).toBeNull();
      expect(screen.queryByText('Body')).toBeNull();
    });

    it('still reads no authored option, and keeps options.gap spacing only the children (rule 9)', async () => {
      const { container } = renderWith(
        defaults,
        form({ label: 'Titled', options: { gap: 'xl', column: 4, float: true } }),
      );
      await settle('Body');
      const bar = container.querySelector(TITLE_BAR);
      const layout = container.querySelector(FILL_LAYOUT);
      // The gap is the layout's, and the title bar is its sibling — outside that gap flow. Rule 8b wraps the
      // heading, so the BAR is what sits beside the layout now; the heading itself is one level further in.
      expect(layout).toHaveClass('gap-8');
      expect(bar?.parentElement).toBe(layout?.parentElement);
      expect(layout).not.toHaveClass('grid');
    });
  });

  describe('the two presentations (rules 6, 7, 8)', () => {
    it('renders an <h1> at the app h1 scale in the fillable set', async () => {
      const { container } = renderWith(defaults, form({ label: 'Scaled' }));
      await settle('Body');
      const title = container.querySelector(TITLE);
      expect(title?.tagName).toBe('H1');
      expect(title).toHaveClass('text-h1');
    });

    it('renders an <h1> at the app h1 scale in the studio set', async () => {
      const { container } = renderWith(studio, form({ label: 'Scaled' }));
      await settle('Body');
      const title = container.querySelector(TITLE);
      expect(title?.tagName).toBe('H1');
      expect(title).toHaveClass('text-h1');
    });

    it('renders the studio title plain — data-slot="form-title", no rule and no chrome', async () => {
      const { container } = renderWith(studio, form({ label: 'Plain' }));
      await settle('Body');
      const title = container.querySelector(TITLE);
      expect(title).toHaveTextContent('Plain');
      expect(title).not.toHaveClass('border-b-2');
      expect(title).not.toHaveClass('border-bcgov-gold');
    });

    it('renders the fillable title with a full-width bcgov-gold lower border', async () => {
      const { container } = renderWith(defaults, form({ label: 'Ruled' }));
      await settle('Body');
      const bar = container.querySelector(TITLE_BAR);
      expect(bar).toHaveTextContent('Ruled');
      expect(bar).toHaveClass('border-b-2', 'border-bcgov-gold');
    });

    it('insets the title TEXT but never the rule, so the border still spans the full width (rule 8b)', async () => {
      const { container } = renderWith(defaults, form({ label: 'Ruled' }));
      await settle('Body');
      const bar = container.querySelector(TITLE_BAR);
      const title = container.querySelector(TITLE);

      // The padding is on the heading, so the title no longer sits at top 0 / left 0 / right 0 — and it is EQUAL
      // on all four sides, so `p-6` rather than a per-side set.
      expect(title).toHaveClass('p-6');
      // No cast: this file imports a FIXTURE type named `Node`, so `title as Node` would shadow the DOM one.
      expect(bar?.contains(title)).toBe(true);
      // The point of the split: ANY horizontal padding on the ruled element would inset the gold rule with the
      // text. Asserted as the absence of the specific classes that would do it, on the element carrying the border.
      expect(bar).not.toHaveClass('p-6');
      expect(bar).not.toHaveClass('px-6');
      expect(bar?.className).not.toMatch(/(^|\s)(p|px|pl|pr)-/);
    });

    it("pads a Form's element container by twice the title's horizontal inset, and below it (rule 8c)", async () => {
      const { container } = renderWith(defaults, form({ label: 'Ruled' }));
      await settle('Body');
      // px-6 on the title → px-12 on the container, with the same amount beneath.
      expect(container.querySelector(FILL_LAYOUT)).toHaveClass('px-12', 'pb-12');
    });

    it('leaves a nested VerticalLayout unpadded, so the inset never compounds (rule 8c)', async () => {
      const { container } = renderWith(
        defaults,
        el({
          type: 'Form',
          label: 'Outer',
          elements: [{ type: 'VerticalLayout', elements: [heading('Body')] }],
        }),
      );
      await settle('Body');
      const stack = container.querySelector('[data-layout-type="VerticalLayout"]');
      expect(stack).not.toHaveClass('px-12');
      expect(stack).not.toHaveClass('pb-12');
      // Guard: proves the query found the nested stack rather than silently matching nothing.
      expect(stack).toHaveClass('flex', 'flex-col');
    });
  });

  describe('empty title (rules 10, 11)', () => {
    it('renders nothing at all in the fillable set when the title is absent', async () => {
      const { container } = renderWith(defaults, form());
      await settle('Body');
      expect(container.querySelector(TITLE)).toBeNull();
      expect(container.querySelector(PLACEHOLDER)).toBeNull();
    });

    it('renders nothing in the fillable set for an empty or whitespace-only title', async () => {
      const empty = renderWith(defaults, form({ label: '' }));
      await settle('Body');
      expect(empty.container.querySelector(TITLE)).toBeNull();
      empty.unmount();

      const blank = renderWith(defaults, form({ label: '   ' }));
      await settle('Body');
      expect(blank.container.querySelector(TITLE)).toBeNull();
    });

    it('renders the muted "Untitled form" placeholder on the studio canvas when the title is empty', async () => {
      const { container } = renderWith(studio, form());
      await settle('Body');
      const placeholder = container.querySelector(PLACEHOLDER);
      expect(placeholder).toHaveTextContent(FORM_TITLE_PLACEHOLDER);
      // Muted, inside the half-opacity title block (rule 7b), so it reads fainter than a written title.
      expect(placeholder).toHaveClass('text-muted-foreground');
      expect(container.querySelector(TITLE)).toBeNull();
    });

    it('never writes the placeholder into the document', async () => {
      const untitled = form();
      renderWith(studio, untitled);
      await settle('Body');
      expect((untitled as Node).label).toBeUndefined();
    });
  });

  describe('inspector (rules 12, 13, 14)', () => {
    const formRoot = form({ label: 'Titled' });
    const layout = el({ type: 'VerticalLayout', label: 'Stack', elements: [heading('Body')] });
    const layoutRoot = el({ type: 'Form', label: 'Root', elements: [layout] });

    it("lists a Form's label key in the inspector form schema's required array", () => {
      const { form: built } = formFor(formRoot, formRoot, schema);
      expect(built.schema.required).toContain('label');
    });

    it('omits required entirely for an element with no required field', () => {
      const { form: built } = formFor(layout, layoutRoot, schema);
      expect(built.schema.required).toBeUndefined();
    });

    it('labels the field "Title" with the form hint on a Form', () => {
      const ctx = contextFor(formRoot, formRoot);
      expect(labelField?.labelFor?.(ctx)).toBe('Title');
      expect(labelField?.required?.(ctx)).toBe(true);
      const { form: built } = formFor(formRoot, formRoot, schema);
      expect(fieldSchema(built, 'label')).toMatchObject({
        description: 'Shown at the top of the form.',
      });
    });

    it('keeps "Label" and its existing hint on a layout', () => {
      const ctx = contextFor(layout, layoutRoot);
      expect(labelField?.labelFor?.(ctx) ?? labelField?.label).toBe('Label');
      expect(labelField?.required?.(ctx) ?? false).toBe(false);
      const { form: built } = formFor(layout, layoutRoot, schema);
      expect(fieldSchema(built, 'label')).toMatchObject({
        description: 'Names the layout in the element path.',
      });
    });

    it("writes '' when a Form's title is cleared, keeping the key", () => {
      const ctx = contextFor(formRoot, formRoot);
      const edit = labelField?.write(ctx, { element: ctx.element, schema }, '');
      expect(edit?.element).toHaveProperty('label', '');
    });

    it("removes the key when a non-Form element's label is cleared", () => {
      const ctx = contextFor(layout, layoutRoot);
      const edit = labelField?.write(ctx, { element: ctx.element, schema }, '');
      expect(edit?.element).not.toHaveProperty('label');
    });
  });

  describe('code editor metaschema (rules 15, 16)', () => {
    it('requires a non-empty label on the form definition', () => {
      expect(UISCHEMA_METASCHEMA.definitions.form.required).toContain('label');
      // `required` alone only demands the key be present, and rule 14 clears to '' — so the title needs a length too.
      expect(UISCHEMA_METASCHEMA.definitions.form.properties.label).toMatchObject({ minLength: 1 });
      expect(JSON.stringify(UISCHEMA_METASCHEMA)).toContain(
        "The form's title, shown at the top of the form and in the element path.",
      );
    });

    it('reports a problem for a Form with no label, at the root and inside a Stage', () => {
      expect(uischemaOk({ type: 'Form', elements: [] })).toBe(false);
      // An EMPTY title is refused too, so the inspector's cleared '' (rule 14) is visibly invalid.
      expect(uischemaOk({ type: 'Form', label: '', elements: [] })).toBe(false);
      expect(uischemaOk(stageOf({ type: 'Form', label: '', elements: [] }))).toBe(false);
      expect(uischemaOk({ type: 'Form', label: 'Titled', elements: [] })).toBe(true);
      // `#/definitions/form` is shared with the Flow metaschema, so a Stage's Forms are covered too.
      expect(uischemaOk(stageOf({ type: 'Form', elements: [] }))).toBe(false);
      expect(uischemaOk(stageOf({ type: 'Form', label: 'Titled', elements: [] }))).toBe(true);
    });

    it('still accepts the built-in sample and the flow template', () => {
      expect(uischemaOk(STUDIO_SAMPLE_UISCHEMA)).toBe(true);
      expect(uischemaOk(FLOW_TEMPLATE_UISCHEMA)).toBe(true);
    });
  });

  describe('seeded documents (rules 17, 18)', () => {
    it('gives emptyForm() the title "Untitled form"', () => {
      expect(UNTITLED_FORM).toBe('Untitled form');
      expect((documentFor('new-basic').uischema as Node).label).toBe(UNTITLED_FORM);
    });

    it('gives STUDIO_SAMPLE_UISCHEMA the title "Untitled form"', () => {
      expect(STUDIO_SAMPLE_UISCHEMA.label).toBe(UNTITLED_FORM);
    });

    it('leaves the already-labelled flow template Forms unchanged', () => {
      const titles: string[] = [];
      const visit = (element: Node) => {
        if (element.type === 'Form') titles.push(labelOf(element, ''));
        for (const child of element.elements ?? []) visit(child);
      };
      visit(FLOW_TEMPLATE_UISCHEMA as Node);
      expect(titles.length).toBeGreaterThan(0);
      expect(titles).not.toContain('');
      expect(titles).not.toContain(UNTITLED_FORM);
    });

    it('opens every studio-created document with a title that satisfies the metaschema', () => {
      const choices = [
        'new-basic',
        'new-multi-stage',
        'template-basic',
        'template-multi-stage',
      ] as const;
      for (const choice of choices) {
        expect(uischemaOk(documentFor(choice).uischema), choice).toBe(true);
      }
    });
  });
});
