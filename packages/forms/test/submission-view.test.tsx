import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ROOT_MESSAGE } from '../src/runner/form-runner';
import { SubmissionView } from '../src/runner/submission-view';
import { NOT_ANSWERED } from '../src/renderers/ui/control-plain-field';

// Doc 211 rules 14-17, 22, 24-25 — <SubmissionView> over a `Form` root: what it renders, and what it refuses
// to render. The Flow behaviour (the rail, the review step) is submission-view-flow.test.tsx.

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name', minLength: 20 },
    province: {
      type: 'string',
      title: 'Province',
      oneOf: [
        { const: 'bc', title: 'British Columbia' },
        { const: 'ab', title: 'Alberta' },
      ],
    },
  },
  required: ['name'],
};

const el = (element: object) => element as UISchemaElement;
const control = (key: string) => ({ type: 'Control', scope: `#/properties/${key}` });
const formRoot = (label = 'Apply') =>
  el({ type: 'Form', label, elements: [control('name'), control('province')] });

const renderView = (uischema: UISchemaElement, data: Record<string, unknown> = {}) =>
  render(<SubmissionView schema={schema} uischema={uischema} data={data} />);

const values = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-slot="plain-field-value"]')].map(
    (node) => node.textContent,
  );

describe('the root it accepts (rule 15)', () => {
  it('refuses a root that is neither Form nor Flow with the runner ROOT_MESSAGE', () => {
    const { container } = renderView(el({ type: 'VerticalLayout', elements: [control('name')] }));

    expect(screen.getByRole('alert')).toHaveTextContent(ROOT_MESSAGE);
    expect(container.querySelector('[data-slot="plain-field"]')).toBeNull();
  });

  it('renders a Form root', () => {
    const { container } = renderView(formRoot(), { name: 'Jo Rivers' });

    expect(screen.queryByRole('alert')).toBeNull();
    expect(container.querySelector('[data-slot="submission-view"]')).toBeInTheDocument();
  });
});

describe('a Form root (rules 17, 22)', () => {
  it('renders every control of the Form as plain text', () => {
    const { container } = renderView(formRoot(), { name: 'Jo Rivers', province: 'bc' });

    expect(values(container)).toEqual(['Jo Rivers', 'British Columbia']);
    expect(container.querySelector('input, textarea, select')).toBeNull();
  });

  it('renders an unanswered control as Not answered rather than skipping it (rule 9)', () => {
    const { container } = renderView(formRoot(), { name: 'Jo Rivers' });

    expect(values(container)).toEqual(['Jo Rivers', NOT_ANSWERED]);
  });

  it('renders no step rail', () => {
    const { container } = renderView(formRoot(), { name: 'Jo Rivers' });

    expect(container.querySelector('[data-slot="runner-step-number"]')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('renders no action bar at all — not a disabled one (rule 22)', () => {
    renderView(formRoot(), { name: 'Jo Rivers' });

    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull();
    expect(document.querySelector('[data-slot="runner-actions"]')).toBeNull();
  });

  it('declares the fill-page container, so the layouts stay responsive (rule 17)', () => {
    const { container } = renderView(formRoot(), {});

    // Doc 184 rule 17b: a plain `sm:` would silently ignore the studio's preview sizes.
    expect(container.querySelector('[data-slot="fill-page"]')).toHaveClass('@container/fill-page');
  });

  it('renders the Form title', () => {
    renderView(formRoot('Apply for a licence'), {});

    expect(screen.getByText('Apply for a licence')).toBeInTheDocument();
  });
});

describe('it cannot change anything (rules 14, 16)', () => {
  it('shows no validation message for data that fails the schema', () => {
    // `name` is `minLength: 20` and required, so a fillable form would flag both of these.
    const { container } = renderView(formRoot(), { name: 'short' });

    expect(container.querySelector('[data-slot="field-error"]')).toBeNull();
    expect(container.querySelector('[aria-invalid]')).toBeNull();
    expect(values(container)).toEqual(['short', NOT_ANSWERED]);
  });

  it('shows a value the schema no longer admits rather than hiding it (rule 10)', () => {
    const { container } = renderView(formRoot(), { name: 'Jo Rivers', province: 'yt' });

    expect(values(container)).toEqual(['Jo Rivers', 'yt']);
  });
});

describe('print (rules 24-25)', () => {
  // jsdom evaluates no `@media print` (it evaluates no container query either — doc 184 rule 17b), so what can
  // be pinned here is the markup. The printed page itself is hand-verified.
  it('hides the rail in print', () => {
    const { container } = renderView(formRoot(), {});

    // A Form root has no rail at all; the row that would hold one stops being a row in print.
    expect(container.querySelector('[data-slot="submission-view"]')).toHaveClass('print:block');
  });

  it('releases the content column height and overflow in print', () => {
    const { container } = renderView(formRoot(), {});

    expect(container.querySelector('[data-slot="submission-view"]')).toHaveClass('print:h-auto');
    expect(container.querySelector('[data-slot="submission-view-content"]')).toHaveClass(
      'print:overflow-visible',
    );
  });
});
