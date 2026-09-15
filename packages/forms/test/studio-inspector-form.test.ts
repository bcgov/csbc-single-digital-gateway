import { describe, expect, it } from 'vitest';
import { inspectorForm } from '../src/studio/inspector/inspector-form';
import { createElementIds } from '../src/studio/layout/element-ids';
import {
  agree,
  choiceControl,
  choiceSchema,
  docOf,
  el,
  fieldControl,
  fieldSchema,
  formFor,
  grid,
  heading,
  name,
  nested,
  qty,
  root,
  row,
  rowQty,
  schema,
  sections,
} from './inspector-fixtures';

// Doc 187 rules 8-12, 9b — which settings an element has, how they are laid out, and their field schemas.
// Reading the document and cross-field errors are in studio-inspector-read.test.ts.

/** The sections of `element`'s inspector form, alone in a root VerticalLayout over `choiceSchema`. */
const choiceSections = (element: ReturnType<typeof el>) =>
  sections(formFor(element, docOf(element), choiceSchema).form);

describe('fields per element (rules 8-10)', () => {
  it('gives a string Control General, Validation, Appearance and Layout settings', () => {
    expect(sections(formFor(name).form)).toEqual([
      ['General', ['label', 'description', 'placeholder']],
      ['Validation', ['required', 'maxLength']],
      ['Appearance', ['component']],
      ['Layout', ['width']],
    ]);
  });

  it('gives a number Control minimum, maximum and step but no Appearance section', () => {
    expect(sections(formFor(qty).form)).toEqual([
      ['General', ['label', 'description', 'placeholder']],
      ['Validation', ['required', 'minimum', 'maximum', 'step']],
      ['Layout', ['width']],
    ]);
  });

  it('gives a boolean Control label, description, required and component (doc 188 rule 25)', () => {
    // `agree` is a boolean property, and the Control sits in the root VerticalLayout (no width).
    expect(sections(formFor(agree).form)).toEqual([
      ['General', ['label', 'description']],
      ['Validation', ['required']],
      ['Appearance', ['component']],
    ]);
  });

  it('gives a choice Control a placeholder unless it is a radio group, and no text or number settings', () => {
    const withPlaceholder = [
      ['General', ['label', 'description', 'placeholder']],
      ['Validation', ['required']],
      ['Appearance', ['component']],
    ];
    expect(choiceSections(choiceControl())).toEqual(withPlaceholder);
    expect(choiceSections(el({ type: 'Control', scope: '#/properties/seats' }))).toEqual(
      withPlaceholder,
    );
    expect(choiceSections(choiceControl({ component: 'radio-group' }))).toEqual([
      ['General', ['label', 'description']],
      ['Validation', ['required']],
      ['Appearance', ['component']],
    ]);
  });

  it('gives a Control of another value type only label, description and required', () => {
    const count = el({ type: 'Control', scope: '#/properties/count' });
    expect(sections(formFor(count, docOf(count), choiceSchema).form)).toEqual([
      ['General', ['label', 'description']],
      ['Validation', ['required']],
    ]);
  });

  it('gives a Control with a nested scope only label and width', () => {
    expect(sections(formFor(nested).form)).toEqual([
      ['General', ['label']],
      ['Layout', ['width']],
    ]);
  });

  it('gives a Heading text, level, size and width', () => {
    expect(sections(formFor(heading).form)).toEqual([
      ['General', ['text']],
      ['Appearance', ['level', 'size']],
      ['Layout', ['width']],
    ]);
  });

  it('gives a HorizontalLayout label and columns, and a nested Grid label, columns and width', () => {
    // Doc 193 rule 13: every layout also gets Gap, after Columns; doc 194 rule 17: a row then gets Dividers.
    expect(sections(formFor(row).form)).toEqual([
      ['General', ['label']],
      ['Layout', ['columns', 'gap', 'dividers']],
    ]);
    const outer = el({
      type: 'VerticalLayout',
      elements: [el({ type: 'Grid', elements: [grid] })],
    });
    expect(sections(formFor(grid, outer).form)).toEqual([
      ['General', ['label']],
      ['Layout', ['columns', 'gap', 'width']],
    ]);
  });

  it('gives the root VerticalLayout a label and a gap', () => {
    expect(sections(formFor(root).form)).toEqual([
      ['General', ['label']],
      ['Layout', ['gap']],
    ]);
  });

  it('renders no sections for an element with no settings', () => {
    const unknown = el({ type: 'Categorization', elements: [] });
    expect(sections(formFor(unknown, unknown).form)).toEqual([]);
  });

  it('has no form for an id not in the document', () => {
    const ids = createElementIds();
    expect(inspectorForm({ schema, uischema: root }, 'el-999', ids)).toBeUndefined();
  });

  it("names the selected element's type", () => {
    expect(formFor(heading).form.elementType).toBe('Heading');
    expect(formFor(row).form.elementType).toBe('HorizontalLayout');
  });
});

/** The `options.orientation` of the field Control for `key`. */
const orientationOf = (form: ReturnType<typeof formFor>['form'], key: string) =>
  fieldControl(form, key)?.options?.['orientation'];

/** The expected field schema of a finite whole-number setting (rule 11b). */
const wholeNumbers = (minimum: number, maximum: number) => ({
  type: 'number',
  oneOf: Array.from({ length: maximum - minimum + 1 }, (_unused, index) => ({
    const: minimum + index,
    title: String(minimum + index),
  })),
});

describe('horizontal number fields (rule 9b)', () => {
  it('lays every number field out horizontally', () => {
    const number = formFor(qty).form;
    for (const key of ['minimum', 'maximum', 'step']) {
      expect(orientationOf(number, key), key).toBe('horizontal');
    }
    expect(orientationOf(formFor(name).form, 'maxLength')).toBe('horizontal');
    expect(orientationOf(formFor(name).form, 'width')).toBe('horizontal');
    expect(orientationOf(formFor(heading).form, 'level')).toBe('horizontal');
    expect(orientationOf(formFor(heading).form, 'size')).toBe('horizontal');
    expect(orientationOf(formFor(row).form, 'columns')).toBe('horizontal');
  });

  it('keeps string and boolean fields stacked, and never groups fields into rows', () => {
    const { form } = formFor(name);
    for (const key of ['label', 'description', 'placeholder', 'required', 'component']) {
      expect(orientationOf(form, key), key).toBeUndefined();
    }
    // Description keeps its textarea option, and the Label its placeholder hint, alongside no orientation.
    expect(fieldControl(form, 'description')?.options).toEqual({ component: 'textarea' });
    expect(JSON.stringify(form.uischema)).not.toContain('HorizontalLayout');
  });
});

describe('field schemas and hints (rules 11-12)', () => {
  it('labels every field control', () => {
    const { form } = formFor(name);
    const keys = [
      'label',
      'description',
      'placeholder',
      'required',
      'maxLength',
      'component',
      'width',
    ];
    expect(keys.map((key) => fieldControl(form, key)?.label)).toEqual([
      'Label',
      'Description',
      'Placeholder',
      'Required',
      'Max length',
      'Component',
      'Width',
    ]);
    expect(fieldControl(formFor(heading).form, 'size')?.label).toBe('Heading size');
  });

  it('types strings, booleans and integer-valued numbers', () => {
    const { form } = formFor(name);
    expect(fieldSchema(form, 'label')).toMatchObject({ type: 'string' });
    expect(fieldSchema(form, 'required')).toEqual({ type: 'boolean' });
    expect(fieldSchema(form, 'maxLength')).toEqual({ type: 'number', minimum: 0, multipleOf: 1 });
    expect(fieldControl(form, 'description')?.options).toMatchObject({ component: 'textarea' });
    // Doc 188 rule 22: booleans ask renderers/ui for a small Switch.
    expect(fieldControl(form, 'required')?.options).toEqual({ component: 'switch', size: 'sm' });
  });

  it('offers each control kind its own components, default first, in a Combobox (doc 188 rule 26)', () => {
    const { form } = formFor(name);
    expect(fieldSchema(form, 'component')).toEqual({
      type: 'string',
      oneOf: [
        { const: 'input', title: 'Input' },
        { const: 'textarea', title: 'Textarea' },
      ],
    });
    // No options: the oneOf field schema dispatches to the default renderers/ui Combobox.
    expect(fieldControl(form, 'component')?.options).toBeUndefined();

    const plan = choiceControl();
    expect(fieldSchema(formFor(plan, docOf(plan), choiceSchema).form, 'component')).toEqual({
      type: 'string',
      oneOf: [
        { const: 'combobox', title: 'Combobox' },
        { const: 'radio-group', title: 'Radio group' },
      ],
    });
    expect(fieldSchema(formFor(agree).form, 'component')).toEqual({
      type: 'string',
      oneOf: [
        { const: 'checkbox', title: 'Checkbox' },
        { const: 'switch', title: 'Switch' },
      ],
    });
  });

  it('bounds number, heading and column settings', () => {
    const number = formFor(qty).form;
    expect(fieldSchema(number, 'minimum')).toEqual({ type: 'number' });
    expect(fieldSchema(number, 'maximum')).toEqual({ type: 'number' });
    expect(fieldSchema(number, 'step')).toEqual({ type: 'number', exclusiveMinimum: 0 });

    // Rule 11b: finite whole-number settings are number oneOfs, which renderers/ui renders as a Combobox.
    const headingForm = formFor(heading).form;
    for (const key of ['level', 'size']) {
      expect(fieldSchema(headingForm, key)).toEqual(wholeNumbers(1, 6));
    }
    expect(fieldSchema(formFor(row).form, 'columns')).toEqual(wholeNumbers(2, 6));
    const outer = el({ type: 'VerticalLayout', elements: [grid] });
    expect(fieldSchema(formFor(grid, outer).form, 'columns')).toEqual(wholeNumbers(1, 12));
  });

  it('titles each whole-number option with its number, ascending (rule 11b)', () => {
    expect(fieldSchema(formFor(heading).form, 'level')?.oneOf).toEqual([
      { const: 1, title: '1' },
      { const: 2, title: '2' },
      { const: 3, title: '3' },
      { const: 4, title: '4' },
      { const: 5, title: '5' },
      { const: 6, title: '6' },
    ]);
  });

  it("bounds width by the parent Grid's columns, else 12", () => {
    expect(fieldSchema(formFor(name).form, 'width')).toEqual(wholeNumbers(1, 12));
    const child = el({ type: 'Heading', text: 'x' });
    const inGrid = (options: object) =>
      el({ type: 'VerticalLayout', elements: [el({ type: 'Grid', options, elements: [child] })] });
    expect(fieldSchema(formFor(child, inGrid({ column: 6 })).form, 'width')).toEqual(
      wholeNumbers(1, 6),
    );
    expect(fieldSchema(formFor(child, inGrid({ column: 'x' })).form, 'width')).toEqual(
      wholeNumbers(1, 12),
    );
  });

  it('bounds width in a HorizontalLayout by the columns the other children leave free', () => {
    // columns 4, the other child is 1 wide → 3.
    expect(fieldSchema(formFor(rowQty).form, 'width')).toEqual(wholeNumbers(1, 3));
    const full = el({
      type: 'HorizontalLayout',
      options: { columns: 2 },
      elements: [el({ type: 'Heading', text: 'a', options: { gridItem: { w: 2 } } }), rowQty],
    });
    const doc = el({ type: 'VerticalLayout', elements: [full] });
    expect(fieldSchema(formFor(rowQty, doc).form, 'width')).toEqual(wholeNumbers(1, 1));
  });

  it("hints a Control's Label with its property title and describes a layout's Label", () => {
    expect(fieldControl(formFor(name).form, 'label')?.options).toMatchObject({
      placeholder: 'Name',
    });
    expect(fieldControl(formFor(nested).form, 'label')?.options?.['placeholder']).toBeUndefined();
    expect(fieldSchema(formFor(row).form, 'label')).toMatchObject({
      description: 'Names the layout in the element path.',
    });
    expect(fieldSchema(formFor(name).form, 'label')?.description).toBeUndefined();
  });
});
