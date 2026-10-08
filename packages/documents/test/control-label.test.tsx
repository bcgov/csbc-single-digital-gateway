import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import * as ui from '../src/renderers/ui/index';
import { LabelPresentationContext } from '../src/renderers/ui/control-label';
import { hideLabel } from '../src/renderers/ui/hide-label';
import type { CapabilityMap } from '../src/studio/capabilities/capability-types';
import { settingChoices } from '../src/studio/capabilities/capability-fields';
import { governanceOf } from '../src/studio/capabilities/governance';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { variantOf } from '../src/studio/document-types';
import { findById } from '../src/studio/element-ids';
import { DocumentPreview } from '../src/studio/document-preview';
import { FormPageBody } from '../src/studio/form-page';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { inspectorForm } from '../src/studio/inspector/inspector-form';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';
import { variantFieldItems } from '../src/studio/variants/variant-fields';
import { DocumentView } from '../src/view';
import { control, form } from './funnel-fixtures';

// Doc 285: a Control's `options.hideLabel` hides its label visually — still its accessible name — everywhere but the
// studio canvas, which marks it with an eye-off icon instead.

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name', description: 'As on your ID', maxLength: 20 },
    bio: { type: 'string', title: 'Bio' },
    region: {
      type: 'string',
      title: 'Region',
      oneOf: [
        { const: 'n', title: 'North' },
        { const: 's', title: 'South' },
      ],
    },
    tags: {
      type: 'array',
      title: 'Tags',
      items: {
        oneOf: [
          { const: 'a', title: 'A' },
          { const: 'b', title: 'B' },
        ],
      },
    },
    agree: { type: 'boolean', title: 'I agree' },
    age: { type: 'integer', title: 'Age' },
    about: { type: 'object', title: 'About', required: ['root'] },
    people: {
      type: 'array',
      title: 'People',
      items: { type: 'object', properties: { first: { type: 'string', title: 'First' } } },
    },
  },
  required: ['name'],
};

const hidden = (key: string, options: Record<string, unknown> = {}, extra = {}) => ({
  type: 'Control',
  scope: `#/properties/${key}`,
  options: { hideLabel: true, ...options },
  ...extra,
});

function renderUi(element: Record<string, unknown>, wrap = (node: ReactNode) => node) {
  return render(
    wrap(
      <JsonForms
        schema={SCHEMA}
        // The ui set has no layout renderers: the Control is the root, as in renderers-string.test.tsx.
        uischema={element as never}
        data={{}}
        renderers={ui.renderers}
        cells={ui.cells}
      />,
    ),
  );
}

const hiddenLabels = () => [...document.querySelectorAll<HTMLElement>('[data-label-hidden]')];

/** Rule 2: one visually hidden label, still wired to what it names; and rule 3: no key `aria-label` anywhere. */
function expectHiddenButNaming(text: string, key: string) {
  const labels = hiddenLabels();
  expect(labels).toHaveLength(1);
  const label = labels[0]!;
  expect(label).toHaveTextContent(text);
  expect(label).toHaveClass('sr-only');
  const forId = label.getAttribute('for');
  const named =
    forId !== null
      ? document.getElementById(forId)
      : document.querySelector(`[aria-labelledby~="${label.id}"]`);
  expect(named).not.toBeNull();
  expect(document.querySelector(`[aria-label="${key}"]`)).toBeNull();
}

const dim = (node: ReactNode) => (
  <LabelPresentationContext value="dim">{node}</LabelPresentationContext>
);

const target = (c: DocumentContent, id: string, variant?: string) =>
  inspectorTarget(c, { pageSelectedId: id, focusedId: 'F', formId: 'F' }, variant)!;

const optionsAt = (c: DocumentContent, id: string, variant = 'default') =>
  findById(variantOf(c, variant), id)?.['options'] as Record<string, unknown> | undefined;

describe('hideLabel (rule 1)', () => {
  it('is true only for options.hideLabel === true', () => {
    expect(hideLabel({ type: 'Control', options: { hideLabel: true } })).toBe(true);
    expect(hideLabel({ options: { hideLabel: true, component: 'switch' } })).toBe(true);
  });

  it('is false for absent, false, "true", 1 and a non-object options', () => {
    for (const options of [
      undefined,
      {},
      { hideLabel: false },
      { hideLabel: 'true' },
      { hideLabel: 1 },
      'x',
      [],
    ])
      expect(hideLabel({ type: 'Control', options })).toBe(false);
    expect(hideLabel(null)).toBe(false);
  });
});

describe('fill controls hide the label visually (rules 2, 5, 6, 7)', () => {
  it('Input: the label is sr-only, still names the input, with no key aria-label', () => {
    renderUi(hidden('bio'));
    expectHiddenButNaming('Bio', 'bio');
    expect(screen.getByRole('textbox', { name: 'Bio' })).toBeInTheDocument();
  });

  it('Textarea and Input keep the description and counter visible', () => {
    renderUi(hidden('name', { component: 'textarea' }));
    expectHiddenButNaming('Full name', 'name');
    expect(screen.getByText('As on your ID')).not.toHaveClass('sr-only');
    expect(document.querySelector('[data-slot="character-count"]')).toHaveTextContent('0/20');
  });

  it('Select and RadioGroup: the hidden label still names the control / group', () => {
    const select = renderUi(hidden('region'));
    expectHiddenButNaming('Region', 'region');
    select.unmount();
    renderUi(hidden('region', { component: 'radio-group' }));
    expectHiddenButNaming('Region', 'region');
  });

  it('MultiSelect and CheckboxGroup: the hidden label still names the control / group', () => {
    const multi = renderUi(hidden('tags'));
    expectHiddenButNaming('Tags', 'tags');
    multi.unmount();
    renderUi(hidden('tags', { component: 'checkbox-group' }));
    expectHiddenButNaming('Tags', 'tags');
  });

  it('Checkbox and Switch: the hidden label still names the control', () => {
    const box = renderUi(hidden('agree'));
    expectHiddenButNaming('I agree', 'agree');
    expect(screen.getByRole('checkbox', { name: 'I agree' })).toBeInTheDocument();
    box.unmount();
    renderUi(hidden('agree', { component: 'switch' }));
    expectHiddenButNaming('I agree', 'agree');
    expect(screen.getByRole('switch', { name: 'I agree' })).toBeInTheDocument();
  });

  it('NumberInput: the hidden label still names the input', () => {
    renderUi(hidden('age'));
    expectHiddenButNaming('Age', 'age');
  });

  it('RichText: the hidden label still names the editor through aria-labelledby', () => {
    renderUi(hidden('about'));
    expectHiddenButNaming('About', 'about');
    expect(hiddenLabels()[0]!.getAttribute('for')).toBeNull();
  });

  it('data table: the hidden label still names the table', () => {
    renderUi(hidden('people'));
    expectHiddenButNaming('People', 'people');
    expect(screen.getByRole('table', { name: 'People' })).toBeInTheDocument();
  });

  it('a required control hides only its label: the red * stays visible, and it stays aria-required (rule 5)', () => {
    renderUi(hidden('name'));
    const label = hiddenLabels()[0]!;
    expect(label).toHaveTextContent(/^Full name$/);
    // The marker sits OUTSIDE the label, at the right of its line, so hiding the label leaves it shown.
    const line = label.closest('[data-slot="control-label-line"]')!;
    const marker = line.querySelector('[data-slot="required-marker"]')!;
    expect(marker).toHaveTextContent('*');
    expect(marker).toHaveClass('text-destructive', 'ml-auto');
    expect(marker).not.toHaveClass('sr-only');
    expect(marker).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveAttribute(
      'aria-required',
      'true',
    );
  });
});

describe('empty label (rules 3, 4)', () => {
  it('an empty label with hideLabel still falls back to the key aria-label and draws no label', () => {
    renderUi(hidden('bio', {}, { label: '' }));
    expect(hiddenLabels()).toHaveLength(0);
    expect(document.querySelector('[data-slot="field-label"]')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'bio' })).toHaveAttribute('aria-label', 'bio');
  });

  it('a shown label is unchanged: no sr-only, no data-label-hidden', () => {
    renderUi({ type: 'Control', scope: '#/properties/bio' });
    const label = document.querySelector('[data-slot="field-label"]')!;
    expect(label).toHaveTextContent('Bio');
    expect(label).not.toHaveClass('sr-only');
    expect(hiddenLabels()).toHaveLength(0);
  });
});

describe('read-back (rule 8)', () => {
  it('DocumentView puts sr-only on the plain-field-label of a hidden-label answer', () => {
    render(
      <DocumentView
        schema={SCHEMA}
        uischema={form('F', 'F', [hidden('bio'), { type: 'Control', scope: '#/properties/name' }])}
        data={{ bio: 'Hello', name: 'Ada' }}
      />,
    );
    const labels = [...document.querySelectorAll('[data-slot="plain-field-label"]')];
    expect(labels.map((l) => [l.textContent, l.classList.contains('sr-only')])).toEqual([
      ['Bio', true],
      ['Full name', false],
    ]);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});

describe('studio canvas marks it (rule 9)', () => {
  it('under the "dim" presentation the label stays visible, muted, with an eye-off marker', () => {
    renderUi(hidden('bio'), dim);
    const label = hiddenLabels()[0]!;
    expect(label).not.toHaveClass('sr-only');
    expect(label).toHaveClass('text-muted-foreground');
    const marker = label.querySelector('[data-slot="hidden-label-marker"]')!;
    expect(marker).toHaveAttribute('title', 'Label hidden in the form');
    expect(marker.querySelector('svg')).not.toBeNull();
  });

  it('the marker is not part of the accessible name', () => {
    renderUi(hidden('bio'), dim);
    expect(hiddenLabels()[0]!.querySelector('[data-slot="hidden-label-marker"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByRole('textbox', { name: 'Bio' })).toBeInTheDocument();
  });

  it('the studio canvas provides "dim"; the preview does not', () => {
    const content: DocumentContent = {
      schema: SCHEMA,
      variants: { default: form('F', 'Page', [{ ...hidden('bio'), id: 'c-bio' }]) },
    };
    const canvas = render(
      <FormPageBody label="Page" page={{ form: content.variants.default, schema: SCHEMA }} />,
    );
    expect(hiddenLabels()[0]).not.toHaveClass('sr-only');
    expect(document.querySelector('[data-slot="hidden-label-marker"]')).not.toBeNull();
    canvas.unmount();
    render(<DocumentPreview content={content} focusedId={null} />);
    expect(hiddenLabels()[0]).toHaveClass('sr-only');
    expect(document.querySelector('[data-slot="hidden-label-marker"]')).toBeNull();
  });
});

describe('inspector field (rules 10, 11, 12)', () => {
  const PROPS = SCHEMA.properties;
  const content = (variants: Record<string, Uischema>): DocumentContent => ({
    schema: { type: 'object', properties: PROPS },
    variants: { default: variants['default']!, ...variants },
  });
  const edit = (
    c: DocumentContent,
    id: string,
    changes: Record<string, unknown>,
    variant?: string,
  ) => {
    const t = target(c, id, variant);
    return applyInspector(c, t, { ...inspectorForm(t).data, ...changes });
  };

  it('offers "Hide label" in Appearance for every Control kind', () => {
    const keys = Object.keys(PROPS);
    const c = content({
      default: form(
        'F',
        'Page',
        keys.map((key) => control(key)),
      ),
    });
    for (const key of keys) {
      const f = inspectorForm(target(c, `c-${key}`));
      expect(f.schema['properties']).toHaveProperty('hideLabel', { type: 'boolean' });
      expect(f.data['hideLabel']).toBe(false);
      const groups = f.uischema['elements'] as { label: string; elements: { scope: string }[] }[];
      const appearance = groups.find((g) => g.label === 'Appearance')!;
      expect(appearance.elements.map((e) => e.scope)).toContain('#/properties/hideLabel');
    }
  });

  it('writes options.hideLabel true, and removes the key when switched off', () => {
    const c = content({ default: form('F', 'Page', [control('bio')]) });
    const on = edit(c, 'c-bio', { hideLabel: true });
    expect(optionsAt(on, 'c-bio')).toEqual({ hideLabel: true });
    expect(inspectorForm(target(on, 'c-bio')).data['hideLabel']).toBe(true);
    const off = edit(on, 'c-bio', { hideLabel: false });
    expect(optionsAt(off, 'c-bio') ?? {}).not.toHaveProperty('hideLabel');
  });

  it('writes the active variant only, and is editable outside default', () => {
    const c = content({
      default: form('F', 'Page', [control('bio')]),
      citizen: form('F', 'Page', [control('bio')]),
    });
    const t = target(c, 'c-bio', 'citizen');
    const appearance = (
      inspectorForm(t).uischema['elements'] as {
        label: string;
        elements: Record<string, unknown>[];
      }[]
    ).find((g) => g.label === 'Appearance')!;
    const field = appearance.elements.find((e) => e['scope'] === '#/properties/hideLabel')!;
    expect((field['options'] as Record<string, unknown>)['readonly']).toBeUndefined();
    const next = edit(c, 'c-bio', { hideLabel: true }, 'citizen');
    expect(optionsAt(next, 'c-bio', 'citizen')).toEqual({ hideLabel: true });
    expect(optionsAt(next, 'c-bio')).toBeUndefined();
  });

  it('is listed as a governable setting and locked by canEdit', () => {
    const c = content({ default: form('F', 'Page', [control('bio')]) });
    expect(settingChoices(target(c, 'c-bio'))).toContainEqual({
      const: 'hideLabel',
      title: 'Hide label',
    });
    const map: CapabilityMap = { elements: { 'c-bio': { edit: ['required'] } } };
    const governance = governanceOf(c, map)!;
    expect(governance.canEdit('c-bio', 'hideLabel')).toBe(false);
    const t = target(c, 'c-bio');
    const locked = applyInspector(c, t, { ...inspectorForm(t).data, hideLabel: true }, governance);
    expect(optionsAt(locked, 'c-bio')).toBeUndefined();
  });

  it('placing a default field into another variant copies hideLabel', () => {
    const c = content({
      default: form('F', 'Page', [{ ...control('bio'), options: { hideLabel: true } }]),
      citizen: form('F', 'Page', []),
    });
    const item = variantFieldItems(c, 'citizen').find((i) => i.id === 'field:bio')!;
    const created = item.create() as { element: Uischema };
    expect(created.element['options']).toEqual({ hideLabel: true });
  });
});
