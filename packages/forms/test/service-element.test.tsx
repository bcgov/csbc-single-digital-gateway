import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers-default';
import { createGridRenderers } from '../src/renderers-gridstack';
import * as studio from '../src/renderers-studio';
import { serviceTester } from '../src/renderers/gridstack/create-grid-renderers';
import {
  FORM_TITLE_PLACEHOLDER,
  NESTED_FORM_MESSAGE,
} from '../src/renderers/gridstack/form-renderer';
import { dropTargetFor } from '../src/renderers/gridstack/grid-drop-target';
import {
  NESTED_SERVICE_MESSAGE,
  SERVICE_TITLE_PLACEHOLDER,
} from '../src/renderers/gridstack/service-renderer';
import { FormRunner, ROOT_MESSAGE } from '../src/runner/form-runner';
import { SubmissionView } from '../src/runner/submission-view';
import { richText } from './rich-text-fixtures';

// Doc 215 rules 6-11, 16 — how a Service RENDERS: the studio's greyed title block above the vertical layout, the
// fillable page with its gold-ruled title bar, the nested error, the root drop zone, and the runner.

const schema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' }, note: { type: 'string', title: 'Note' } },
  required: ['name'],
};
const testerContext = { rootSchema: schema, config: {} };

const el = (element: object) => element as UISchemaElement;
const control = (key: string) => ({ type: 'Control', scope: `#/properties/${key}` });
const service = (element: object = {}) => el({ type: 'Service', elements: [], ...element });
const form = (element: object = {}) => el({ type: 'Form', elements: [], ...element });

type Set = typeof defaults;
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
      validationMode="NoValidation"
    />,
  );
}

const settle = () => act(async () => {});

const titleBlock = (c: HTMLElement) => c.querySelector('[data-slot="form-title-block"]');
const layoutOf = (c: HTMLElement, type: string) =>
  c.querySelector<HTMLElement>(`[data-slot="fill-layout"][data-layout-type="${type}"]`);

describe('the studio Service renderer (rules 7-8)', () => {
  it('dispatches a Service through serviceTester to the vertical layout renderer', async () => {
    const entries = createGridRenderers().layoutRenderers;
    // Appended AFTER the Form entry (rule 8): Grid, Vertical, Horizontal, Form, Service, Section.
    expect(entries[4]?.tester).toBe(serviceTester);
    expect(serviceTester({ type: 'Service' }, schema, testerContext)).toBe(1);
    // No other entry matches a Service, so there is no rank tie (doc 180 rule 15b).
    const matching = entries.filter(
      (e) => e.tester({ type: 'Service' }, schema, testerContext) > 0,
    );
    expect(matching).toHaveLength(1);

    const { container } = renderWith(studio, service({ elements: [control('name')] }));
    await settle();
    // Drawn by the SAME gridstack renderer a VerticalLayout gets, inside a studio frame reporting the
    // element's own type (doc 192 rule 4 — a boundary is identified only by its uischema `type`).
    expect(container.querySelector('[data-element-type="Service"]')).not.toBeNull();
    expect(container.querySelector('.grid-stack')).not.toBeNull();
  });

  it('renders the title and description greyed above the layout, inset to the elements', async () => {
    const { container } = renderWith(
      studio,
      service({
        label: 'Apply for a licence',
        options: { description: richText('Who may apply') },
      }),
    );
    await settle();
    const block = titleBlock(container);
    expect(block).not.toBeNull();
    expect(block).toHaveClass('opacity-50', 'select-none');
    expect(block).toHaveStyle({ paddingInline: 'calc(0.5rem + 1px + 0.5rem)' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Apply for a licence');
    expect(container.querySelector('[data-slot="form-description"]')).toHaveTextContent(
      'Who may apply',
    );
    // Rule 8: the title is a SIBLING above the layout, not inside it.
    expect(block?.nextElementSibling).not.toBeNull();
  });

  it('shows "Untitled service", not "Untitled form", when the title is empty', async () => {
    const { container } = renderWith(studio, service());
    await settle();
    const placeholder = container.querySelector('[data-slot="form-title-placeholder"]');
    expect(placeholder).toHaveTextContent(SERVICE_TITLE_PLACEHOLDER);
    expect(placeholder).toHaveTextContent('Untitled service');
    expect(placeholder).not.toHaveTextContent(FORM_TITLE_PLACEHOLDER);
  });

  it('shows the shared description placeholder when no description is authored', async () => {
    const { container } = renderWith(studio, service({ label: 'Licences' }));
    await settle();
    expect(container.querySelector('[data-slot="form-description-placeholder"]')).toHaveTextContent(
      'Add a description...',
    );
  });

  it('leaves the Form renderer showing "Untitled form" — the factory change is invisible to it', async () => {
    const { container } = renderWith(studio, form());
    await settle();
    expect(container.querySelector('[data-slot="form-title-placeholder"]')).toHaveTextContent(
      FORM_TITLE_PLACEHOLDER,
    );
  });
});

describe('the fillable Service renderer (rule 9)', () => {
  it('renders a Service root through renderers/default with its gold-ruled title bar', async () => {
    const { container } = renderWith(
      defaults,
      service({ label: 'Apply', elements: [control('name')] }),
    );
    await settle();
    const bar = container.querySelector('[data-slot="form-title-bar"]');
    expect(bar).not.toBeNull();
    expect(bar).toHaveClass('border-b-2', 'border-bcgov-gold');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Apply');
    expect(screen.getByRole('textbox', { name: /^Name/ })).toBeInTheDocument();
  });

  it('declares the fill-page container, so a bare Service is the outermost fillable root', async () => {
    const { container } = renderWith(defaults, service({ label: 'Apply' }));
    await settle();
    const page = container.querySelector('[data-slot="fill-page"]');
    expect(page).not.toBeNull();
    expect(page).toHaveClass('@container/fill-page');
  });

  it('insets its elements by FORM_PADDING, exactly as a Form root does', async () => {
    const rendered = renderWith(defaults, service({ elements: [control('name')] }));
    await settle();
    expect(layoutOf(rendered.container, 'Service')).toHaveClass('px-12', 'pb-12');
    rendered.unmount();

    const asForm = renderWith(defaults, form({ elements: [control('name')] }));
    await settle();
    expect(layoutOf(asForm.container, 'Form')).toHaveClass('px-12', 'pb-12');
  });

  it('leaves a nested VerticalLayout unpadded, so the inset never compounds', async () => {
    const { container } = renderWith(
      defaults,
      service({ elements: [{ type: 'VerticalLayout', elements: [control('name')] }] }),
    );
    await settle();
    const nested = layoutOf(container, 'VerticalLayout');
    expect(nested).not.toBeNull();
    expect(nested).not.toHaveClass('px-12');
  });

  it('renders nothing but the title space when title and description are both absent', async () => {
    const { container } = renderWith(defaults, service({ elements: [control('name')] }));
    await settle();
    expect(container.querySelector('[data-slot="form-title-bar"]')).toBeNull();
    expect(container.querySelector('[data-slot="form-title-space"]')).toHaveClass('pt-6');
  });
});

describe('a nested Service (rule 10)', () => {
  it('renders the alert "A Service can only be the root element." in place of its elements', async () => {
    const { container } = renderWith(
      defaults,
      form({ elements: [service({ label: 'Inner', elements: [control('name')] })] }),
    );
    await settle();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(NESTED_SERVICE_MESSAGE);
    expect(alert).toHaveTextContent('A Service can only be the root element.');
    // Rule 10: the SLOT is shared with the Form's nested error — one error, told apart by its message.
    expect(alert).toHaveAttribute('data-slot', 'form-nested-error');
    expect(container.querySelectorAll('[data-slot="form-nested-error"]')).toHaveLength(1);
  });

  it('renders no title and none of its children when nested', async () => {
    const { container } = renderWith(
      defaults,
      form({ elements: [service({ label: 'Inner', elements: [control('name')] })] }),
    );
    await settle();
    expect(screen.queryByText('Inner')).toBeNull();
    expect(screen.queryByRole('textbox', { name: /^Name/ })).toBeNull();
    expect(layoutOf(container, 'Service')).toBeNull();
  });

  it('keeps the Form’s own nested message unchanged', async () => {
    renderWith(defaults, form({ elements: [form({ elements: [control('name')] })] }));
    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent(NESTED_FORM_MESSAGE);
    expect(NESTED_FORM_MESSAGE).not.toBe(NESTED_SERVICE_MESSAGE);
  });
});

function zoned() {
  const zone = document.createElement('div');
  zone.setAttribute('data-slot', 'form-drop-zone');
  const grid = document.createElement('div');
  zone.append(grid);
  return { zone, grid };
}

describe('the root drop zone (rule 11)', () => {
  it('returns the drop zone for a Service root, as it does for a Form root', () => {
    const a = zoned();
    expect(dropTargetFor(a.grid, 'Service')).toBe(a.zone);
    const b = zoned();
    expect(dropTargetFor(b.grid, 'Form')).toBe(b.zone);
  });

  it('returns the grid itself for every other layout type', () => {
    for (const type of ['VerticalLayout', 'HorizontalLayout', 'Grid', 'Section']) {
      const { grid } = zoned();
      expect(dropTargetFor(grid, type), type).toBe(grid);
    }
    expect(dropTargetFor(undefined, 'Service')).toBeUndefined();
  });
});

const submit = () => screen.getByRole('button', { name: 'Submit' });

describe('the runner and the submission view (rule 16)', () => {
  function Harness({ uischema }: { uischema: UISchemaElement }) {
    const [data, setData] = useState<Record<string, unknown>>({});
    return <FormRunner schema={schema} uischema={uischema} data={data} onChange={setData} />;
  }

  const serviceRoot = () =>
    service({ label: 'Apply', elements: [control('name'), control('note')] });

  it('FormRunner renders a Service root as one page instead of the root error', async () => {
    render(<Harness uischema={serviceRoot()} />);
    await settle();
    // The ROOT error specifically — a required field's own error is an alert too.
    expect(document.querySelector('[data-slot="runner-root-error"]')).toBeNull();
    expect(screen.getByRole('textbox', { name: /^Name/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Note/ })).toBeInTheDocument();
    // One page, not a journey: a Service root is not a Flow, so there is no Back (doc 202 rule 34b).
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('FormRunner gates Submit on the whole document’s errors for a Service root', async () => {
    render(<Harness uischema={serviceRoot()} />);
    await settle();
    // `name` is required and unanswered, so `documentHasError` blocks Submit — the Form-root behaviour,
    // reached because a Service root is a page root too. Errors arrive asynchronously, hence `waitFor`.
    await waitFor(() => expect(submit()).toBeDisabled());
    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Ada' } });
    await waitFor(() => expect(submit()).toBeEnabled());
  });

  it('SubmissionView reads a Service root back as plain answers', async () => {
    render(<SubmissionView schema={schema} uischema={serviceRoot()} data={{ name: 'Ada' }} />);
    await settle();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('still refuses a root that is neither a Flow nor a page root, with the reworded message', async () => {
    render(<Harness uischema={el({ type: 'VerticalLayout', elements: [control('name')] })} />);
    await settle();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(ROOT_MESSAGE);
    expect(ROOT_MESSAGE).toBe('The form must be a Form, a Service or a Flow.');
  });
});

describe('the renderer sets (rules 8-9, 26)', () => {
  it('createGridRenderers returns seven layout entries, the Service appended after the Form', () => {
    const entries = createGridRenderers().layoutRenderers;
    // Six: Grid, VerticalLayout, HorizontalLayout, Form, Service, Section.
    expect(entries).toHaveLength(8); // doc 216: +2 for Tabs and TabContentContent
    expect(entries[3]?.tester({ type: 'Form' }, schema, testerContext)).toBe(1);
    expect(entries[4]?.tester).toBe(serviceTester);
  });

  it('fillLayoutRenderers gains one entry and no tester ties with another on a Service', () => {
    const matching = defaults.layoutRenderers.filter(
      (entry) => entry.tester({ type: 'Service' }, schema, testerContext) > 0,
    );
    expect(matching).toHaveLength(1);
    // And the studio set, built from the same factory, matches exactly once too.
    expect(
      studio.layoutRenderers.filter(
        (entry) => entry.tester({ type: 'Service' }, schema, testerContext) > 0,
      ),
    ).toHaveLength(1);
  });
});
