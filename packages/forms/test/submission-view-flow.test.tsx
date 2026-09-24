import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SubmissionView } from '../src/runner/submission-view';
import { REVIEW_STEP_LABEL } from '../src/runner/runner-review-row';
import { BLOCKED_HINT, HAS_ERRORS_HINT } from '../src/runner/runner-row-parts';

// Doc 211 rules 18-23 — <SubmissionView> over a `Flow` root: paged by stage, with a rail that locks nothing.

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    plan: {
      type: 'string',
      title: 'Plan',
      oneOf: [
        { const: 'basic', title: 'Basic' },
        { const: 'pro', title: 'Pro' },
      ],
    },
    note: { type: 'string', title: 'Note' },
  },
  required: ['name'],
};

const el = (element: object) => element as UISchemaElement;
const control = (key: string) => ({ type: 'Control', scope: `#/properties/${key}` });
const form = (label: string, keys: string[] = []) => ({
  type: 'Form',
  label,
  id: `${label}-id`,
  elements: keys.map(control),
});
const stage = (id: string, label: string, forms: object[] = [form(`${label} form`)]) =>
  el({ type: 'Stage', label, elements: forms, id });
const edge = (id: string, source: string, target: string, sourceHandle?: string) => ({
  id,
  source,
  target,
  ...(sourceHandle === undefined ? {} : { sourceHandle }),
});
const flow = (elements: object[], options: object = {}) => el({ type: 'Flow', elements, options });

/** Two stages and a review page (on by default — doc 202 rule 47). */
const TWO_STAGE = flow(
  [
    stage('s1', 'Applicant', [form('Contact', ['name'])]),
    stage('s2', 'Details', [form('More', ['note'])]),
  ],
  { edges: [edge('e1', 's1', 's2')] },
);

const BRANCHING = flow(
  [
    stage('s1', 'Applicant', [form('Contact', ['plan'])]),
    el({
      type: 'Condition',
      label: 'Which plan',
      id: 'x',
      options: {
        rows: [
          {
            id: 'c1',
            label: 'Pro',
            match: 'all',
            clauses: [{ id: 'cl1', field: 'plan', operator: 'equals', value: 'pro' }],
          },
        ],
      },
    }),
    stage('s2', 'Pro', [form('Pro form', ['note'])]),
    stage('s3', 'Basic', [form('Basic form', ['note'])]),
  ],
  { edges: [edge('e1', 's1', 'x'), edge('e2', 'x', 's2', 'c1'), edge('e3', 'x', 's3')] },
);

const renderView = (uischema: UISchemaElement, data: Record<string, unknown> = {}) =>
  render(<SubmissionView schema={schema} uischema={uischema} data={data} />);

const settle = () => act(async () => {});

const sidebar = () => screen.getByRole('navigation', { name: 'Steps' });
const stageRows = () => [...sidebar().querySelectorAll('[data-slot="runner-stage"]')];
const stageNames = () =>
  stageRows().map((row) => row.querySelector('[data-slot="runner-stage-name"]')?.textContent);
const stageButton = (name: string) => {
  const found = within(sidebar())
    .getAllByRole('button', { name: new RegExp(name) })
    .find((button) => button.parentElement?.getAttribute('data-slot') === 'runner-stage');
  if (found === undefined) throw new Error(`no stage button named ${name}`);
  return found;
};
const values = () =>
  [...document.querySelectorAll('[data-slot="plain-field-value"]')].map((n) => n.textContent);

describe('paging by stage (rule 18)', () => {
  it('opens on the Flow start stage', async () => {
    renderView(TWO_STAGE, { name: 'Jo Rivers', note: 'a note' });
    await settle();

    // The rail lists the current stage's Forms by name too (doc 202 rule 11), so the title is read from the
    // page rather than by text alone.
    expect(document.querySelector('[data-slot="form-title"]')).toHaveTextContent('Contact');
    expect(values()).toEqual(['Jo Rivers']);
  });

  it('renders that stage Forms as plain text, and no other stage', async () => {
    renderView(TWO_STAGE, { name: 'Jo Rivers', note: 'a note' });
    await settle();

    expect(screen.queryByText('More')).toBeNull();
    expect(document.querySelector('input, textarea, select')).toBeNull();
  });

  it('shows another stage when its rail row is opened', async () => {
    renderView(TWO_STAGE, { name: 'Jo Rivers', note: 'a note' });
    await settle();

    fireEvent.click(stageButton('Details'));
    await settle();

    expect(values()).toEqual(['a note']);
  });

  it('renders no action bar, so there is no Back, Next, Save draft or Submit (rule 22)', async () => {
    renderView(TWO_STAGE, { name: 'Jo Rivers' });
    await settle();

    for (const name of ['Back', 'Next', 'Submit', 'Save draft'])
      expect(screen.queryByRole('button', { name })).toBeNull();
    expect(document.querySelector('[data-slot="runner-actions"]')).toBeNull();
  });
});

describe('the rail locks nothing (rule 19)', () => {
  it('leaves every listed stage row enabled, including ones after the one on screen', async () => {
    renderView(TWO_STAGE, { name: 'Jo Rivers', note: 'a note' });
    await settle();

    // In the runner, `Details` would be openable only once `Applicant` validated (doc 202 rule 24b).
    for (const row of stageRows()) expect(row.querySelector('button')).not.toBeDisabled();
  });

  it('renders no "upcoming" hint on any listed row', async () => {
    renderView(TWO_STAGE, { name: 'Jo Rivers' });
    await settle();

    // Doc 202 rule 25b's hint is how a locked row says so without relying on colour.
    expect(within(sidebar()).queryByText('upcoming')).toBeNull();
  });

  it('flags no stage as having errors, even when the answers fail the schema', async () => {
    // `name` is required and absent, so the runner would flag `Applicant` once Submit was tried.
    renderView(TWO_STAGE, {});
    await settle();

    expect(sidebar().querySelector('[data-slot="runner-error-flag"]')).toBeNull();
    expect(within(sidebar()).queryByText(HAS_ERRORS_HINT)).toBeNull();
    // And nothing is blocked behind the unfinished page either (doc 202 rule 24b's hint).
    expect(within(sidebar()).queryByText(BLOCKED_HINT)).toBeNull();
  });

  it('still refuses a placeholder-id stage, which no edge can address (rule 19)', async () => {
    // A Stage with no authored id gets a placeholder (doc 195 rule 8) that nothing can navigate to.
    const withPlaceholder = flow(
      [
        stage('s1', 'Applicant', [form('Contact', ['name'])]),
        el({ type: 'Stage', label: 'Nameless', elements: [form('Orphan form', ['note'])] }),
      ],
      { edges: [edge('e1', 's1', '__stage-1')] },
    );
    renderView(withPlaceholder, { name: 'Jo Rivers', note: 'a note' });
    await settle();

    // Doc 202 rule 10c leaves an unaddressable stage off the rail entirely, and rule 13's `placeholder` lock
    // is what would refuse it if it were ever listed. Either way it is not something a reviewer can open.
    const nameless = stageRows().find((row) =>
      row.querySelector('[data-slot="runner-stage-name"]')?.textContent?.includes('Nameless'),
    );
    expect(nameless === undefined || nameless.querySelector('button')?.disabled === true).toBe(
      true,
    );
    // The stage that IS addressable is listed and open, so this is not passing by rendering nothing.
    expect(stageNames()).toContain('Applicant');
  });
});

describe('the listed path (rule 20)', () => {
  it('lists the stages the answers led through, and not a branch that was not taken', async () => {
    renderView(BRANCHING, { plan: 'pro', note: 'a note' });
    await settle();

    expect(stageNames()).toEqual(['Applicant', 'Pro']);
    expect(within(sidebar()).queryByText('Basic')).toBeNull();
  });

  it('lists the other branch for the answers that chose it', async () => {
    renderView(BRANCHING, { plan: 'basic', note: 'a note' });
    await settle();

    expect(stageNames()).toEqual(['Applicant', 'Basic']);
    expect(within(sidebar()).queryByText('Pro')).toBeNull();
  });

  it('skips a stage holding no Forms, exactly as the runner rail does', async () => {
    const withEmpty = flow(
      [
        stage('s1', 'Applicant', [form('Contact', ['name'])]),
        stage('s2', 'Empty', []),
        stage('s3', 'Details', [form('More', ['note'])]),
      ],
      { edges: [edge('e1', 's1', 's2'), edge('e2', 's2', 's3')] },
    );
    renderView(withEmpty, { name: 'Jo Rivers', note: 'a note' });
    await settle();

    expect(stageNames()).toEqual(['Applicant', 'Details']);
  });
});

describe('the review step (rules 21, 23, 26)', () => {
  const reviewRow = () =>
    sidebar().querySelector('[data-slot="runner-review-step"]')?.querySelector('button') ?? null;

  it('lists a review row when the Flow shows one', async () => {
    renderView(TWO_STAGE, { name: 'Jo Rivers' });
    await settle();

    expect(reviewRow()).toBeInTheDocument();
    expect(within(sidebar()).getByText(REVIEW_STEP_LABEL)).toBeInTheDocument();
  });

  it('leaves the review row openable rather than locked to the last Form (rule 19)', async () => {
    renderView(TWO_STAGE, { name: 'Jo Rivers' });
    await settle();

    expect(reviewRow()).not.toBeDisabled();
  });

  it('draws the review row in the REACHED tone, not as a step still ahead (rule 19b)', async () => {
    renderView(TWO_STAGE, { name: 'Jo Rivers' });
    await settle();

    // Found by hand: `disabled` was already false, but the row wore the muted `ahead` chrome — a thin grey rule
    // and grey text — so it READ as unavailable while being perfectly clickable. In a submission nothing is ahead.
    expect(reviewRow()).toHaveClass('border-l-primary');
    expect(reviewRow()?.className).not.toMatch(/border-l-2/);
  });

  it('lists no review row for a Flow authored options.review false', async () => {
    const noReview = flow([stage('s1', 'Applicant', [form('Contact', ['name'])])], {
      edges: [],
      review: false,
    });
    renderView(noReview, { name: 'Jo Rivers' });
    await settle();

    expect(sidebar().querySelector('[data-slot="runner-review-step"]')).toBeNull();
  });

  it('renders every Form of the path as plain text when the review row is opened', async () => {
    renderView(TWO_STAGE, { name: 'Jo Rivers', note: 'a note' });
    await settle();

    const row = reviewRow();
    if (row === null) throw new Error('no review row');
    fireEvent.click(row);
    await settle();

    expect(document.querySelector('[data-slot="runner-review"]')).toBeInTheDocument();
    // Both stages' Forms, on one page — and still no inputs (rule 23's plain presentation).
    expect(values()).toEqual(['Jo Rivers', 'a note']);
    expect(document.querySelector('input, textarea, select')).toBeNull();
  });
});
