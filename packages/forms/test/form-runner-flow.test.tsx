import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers-default';
import { FormRunner } from '../src/runner/form-runner';
import { sidebarStages } from '../src/runner/runner-sidebar';

// Doc 202 rules 9-13, 24-28, 40-43, 46 — a Flow being filled in: the stage sidebar, navigation, gating, and the
// renderer entry that lets the studio's preview run a flow with no change to StudioCanvas.

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
  options: { id: `${label}-id` },
  elements: keys.map(control),
});
const stage = (id: string, label: string, forms: object[] = [form(`${label} form`)]) =>
  el({ type: 'Stage', label, elements: forms, options: { id } });
const edge = (id: string, source: string, target: string, sourceHandle?: string) => ({
  id,
  source,
  target,
  ...(sourceHandle === undefined ? {} : { sourceHandle }),
});
const flow = (elements: object[], options: object = {}) => el({ type: 'Flow', elements, options });

/** Two stages, the first holding a required field, so gating can be exercised. */
const TWO_STAGE = flow(
  [stage('s1', 'Applicant', [form('Contact', ['name'])]), stage('s2', 'Review')],
  {
    edges: [edge('e1', 's1', 's2')],
  },
);

function Harness({
  uischema = TWO_STAGE,
  initial = {},
  documentSchema = schema,
}: {
  uischema?: UISchemaElement;
  initial?: Record<string, unknown>;
  documentSchema?: JsonSchema;
}) {
  const [data, setData] = useState<Record<string, unknown>>(initial);
  return <FormRunner schema={documentSchema} uischema={uischema} data={data} onChange={setData} />;
}

const renderFlow = (props: Parameters<typeof Harness>[0] = {}) => render(<Harness {...props} />);
const settle = () => act(async () => {});

const sidebar = () => screen.getByRole('navigation', { name: 'Steps' });
const stageRows = () => [...sidebar().querySelectorAll('[data-slot="runner-stage"]')];
// Read the NAME slot, not "the second span": each row now also carries a "Step n" caption (rule 9d), so a
// positional query would return "Step 1Applicant" and compare unequal for the wrong reason.
const stageNames = () =>
  stageRows().map((row) => row.querySelector('[data-slot="runner-stage-name"]')?.textContent);
// A STAGE's own button: Form rows are buttons too now (rule 11f), and "Review form" would also match /Review/.
const stageButton = (name: string) => {
  const found = within(sidebar())
    .getAllByRole('button', { name: new RegExp(name) })
    .find((button) => button.parentElement?.getAttribute('data-slot') === 'runner-stage');
  if (found === undefined) throw new Error(`no stage button named ${name}`);
  return found;
};
const nextButton = () => screen.getByRole('button', { name: 'Next' });
const backButton = () => screen.getByRole('button', { name: 'Back' });

describe('FormRunner — a Flow root (doc 202 rules 9-13)', () => {
  describe('layout (rule 9)', () => {
    it('renders a stage sidebar beside a content pane holding exactly one Form', async () => {
      const { container } = renderFlow();
      await settle();
      expect(container.querySelector('[data-slot="runner-sidebar"]')).not.toBeNull();
      expect(container.querySelector('[data-slot="runner-flow-content"]')).not.toBeNull();
      // Only the current Stage's Form is dispatched — the other Stage's fields are not mounted.
      expect(await screen.findByRole('textbox', { name: /^Name/ })).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: /^Note/ })).toBeNull();
    });

    it('collapses the sidebar to a "Stage n of m" line below sm', async () => {
      const { container } = renderFlow();
      await settle();
      const indicator = container.querySelector('[data-slot="runner-stage-indicator"]');
      expect(indicator).toHaveTextContent('Stage 1 of 2 — Applicant');
      // The rail is hidden below `sm`, the line above it — the FlowNav posture.
      expect(indicator).toHaveClass('@min-[40rem]/fill-page:hidden');
      expect(container.querySelector('[data-slot="runner-sidebar"]')).toHaveClass(
        'hidden',
        '@min-[40rem]/fill-page:flex',
      );
    });

    it('uses no SidebarProvider, so it writes no cookie and adds no global key listener', () => {
      const source = readFileSync(
        resolve(import.meta.dirname, '../src/runner/runner-sidebar.tsx'),
        'utf8',
      );
      // Anchored to real imports and usage: the file's header comment NAMES SidebarProvider to explain why it is
      // avoided, so a bare substring check fails on the prose rather than on a dependency.
      expect(source).not.toMatch(/from ['"]@repo\/ui\/sidebar['"]/);
      expect(source).not.toMatch(/<SidebarProvider/);
    });
  });

  describe('the sidebar (rules 10-13)', () => {
    it('lists the Flow’s Stages in elements order, by name', async () => {
      renderFlow();
      await settle();
      expect(stageNames()).toEqual(['Applicant', 'Review']);
    });

    it('lists no Conditions — they are traversed, never visited', async () => {
      const withCondition = flow(
        [
          stage('s1', 'Applicant', [form('Contact', ['name'])]),
          el({ type: 'Condition', label: 'Branch', options: { id: 'x', criteria: [] } }),
          stage('s2', 'Review'),
        ],
        { edges: [edge('e1', 's1', 'x'), edge('e2', 'x', 's2')] },
      );
      renderFlow({ uischema: withCondition });
      await settle();
      expect(stageNames()).toEqual(['Applicant', 'Review']);
      expect(within(sidebar()).queryByText('Branch')).toBeNull();
    });

    it('omits a Stage holding no Forms, which can never become current (rule 10b)', async () => {
      const withEmpty = flow(
        [
          stage('s1', 'Applicant', [form('Contact', ['name'])]),
          stage('s2', 'Empty', []),
          stage('s3', 'Review'),
        ],
        { edges: [edge('e1', 's1', 's2'), edge('e2', 's2', 's3')] },
      );
      renderFlow({ uischema: withEmpty });
      await settle();
      // The traversal walks past it, so listing it would show a step that can never become current.
      expect(stageNames()).toEqual(['Applicant', 'Review']);
      expect(
        sidebarStages({ flow: withEmpty, schema, data: {} }).map(({ label }) => label),
      ).toEqual(['Applicant', 'Review']);
    });

    it('expands the current stage to list its Forms by title (rule 11)', async () => {
      const twoForms = flow(
        [stage('s1', 'Applicant', [form('Contact', ['name']), form('About', ['note'])])],
        {},
      );
      renderFlow({ uischema: twoForms });
      await settle();
      const current = sidebar().querySelector('[data-slot="runner-stage"][data-current]');
      const forms = [...(current?.querySelectorAll('[data-slot="runner-stage-form"]') ?? [])];
      expect(forms.map((row) => row.textContent)).toEqual(['Contact', 'About']);
    });

    it('marks the current Form aria-current="page"', async () => {
      const twoForms = flow(
        [stage('s1', 'Applicant', [form('Contact', ['name']), form('About', ['note'])])],
        {},
      );
      renderFlow({ uischema: twoForms });
      await settle();
      const marked = sidebar().querySelectorAll(
        '[data-slot="runner-stage-form-button"][aria-current="page"]',
      );
      expect(marked).toHaveLength(1);
      expect(marked[0]).toHaveTextContent('Contact');
    });

    it('shows other stages by name alone', async () => {
      renderFlow();
      await settle();
      const rows = stageRows();
      // Only the current stage expands; the rail stays a list of stages, not of every Form.
      expect(rows[0]?.querySelectorAll('[data-slot="runner-stage-form"]').length).toBeGreaterThan(
        0,
      );
      expect(rows[1]?.querySelectorAll('[data-slot="runner-stage-form"]')).toHaveLength(0);
    });

    it('never reads Stage.options.position for ordering (rule 12)', async () => {
      // Positions deliberately reversed: doc 198 made them inert, so `elements` order still decides.
      const positioned = flow(
        [
          el({
            type: 'Stage',
            label: 'Applicant',
            options: { id: 's1', position: { x: 900, y: 900 } },
            elements: [form('Contact', ['name'])],
          }),
          el({
            type: 'Stage',
            label: 'Review',
            options: { id: 's2', position: { x: 0, y: 0 } },
            elements: [form('Decision')],
          }),
        ],
        { edges: [edge('e1', 's1', 's2')] },
      );
      renderFlow({ uischema: positioned });
      await settle();
      expect(stageNames()).toEqual(['Applicant', 'Review']);
    });

    it('omits a placeholder-id Stage entirely — no edge reaches it, so it is never projected (rule 10c)', async () => {
      const placeholder = flow([
        stage('s1', 'Applicant', [form('Contact', ['name'])]),
        // No options.id at all — drawnNodes gives it `__stage-1`, which no edge can address.
        el({ type: 'Stage', label: 'Orphan', elements: [form('Stray')] }),
      ]);
      renderFlow({ uischema: placeholder });
      await settle();
      // SUPERSEDES the old rule 13 behaviour, which listed it locked. Rule 10c lists only the stages the citizen
      // is required to enter, and an unreachable Stage is not one of them — so it is absent rather than disabled.
      expect(stageNames()).toEqual(['Applicant']);
      expect(within(sidebar()).queryByText('Orphan')).toBeNull();
    });
  });

  describe('the projected path (rule 10c)', () => {
    const branchingFlow = flow(
      [
        stage('s1', 'Applicant', [form('Contact', ['plan'])]),
        el({
          type: 'Condition',
          label: 'Which plan',
          options: {
            id: 'x',
            criteria: [{ id: 'c1', field: 'plan', operator: 'equals', value: 'pro' }],
          },
        }),
        stage('s2', 'Pro', [form('Pro form')]),
        stage('s3', 'Basic', [form('Basic form')]),
      ],
      { edges: [edge('e1', 's1', 'x'), edge('e2', 'x', 's2', 'c1'), edge('e3', 'x', 's3')] },
    );

    it('stops at a Condition on an unanswered REQUIRED field, so neither branch is listed yet', async () => {
      // With `plan` required and blank, the citizen must still answer it and the answer may pick either branch,
      // so the runner promises neither (rule 10f).
      renderFlow({
        uischema: branchingFlow,
        documentSchema: { ...schema, required: ['name', 'plan'] },
      });
      await settle();
      expect(stageNames()).toEqual(['Applicant']);
    });

    it('lists the default branch for an unanswered OPTIONAL field — blank takes it anyway (rule 10f)', async () => {
      renderFlow({ uischema: branchingFlow });
      await settle();
      expect(stageNames()).toEqual(['Applicant', 'Basic']);
      expect(within(sidebar()).queryByText('Pro')).toBeNull();
    });

    it('lists the chosen branch once the answer decides it, and not the other', async () => {
      renderFlow({ uischema: branchingFlow, initial: { plan: 'pro' } });
      await settle();
      expect(stageNames()).toEqual(['Applicant', 'Pro']);
      expect(within(sidebar()).queryByText('Basic')).toBeNull();
    });

    it('lists the default branch when the answer matches no criterion — a decision, not a guess', async () => {
      // `plan` IS answered, so "no criterion matched" is itself a real answer and the default path is settled.
      // This is the case that separates rule 10c from simply following `conditionEdge` unconditionally.
      renderFlow({ uischema: branchingFlow, initial: { plan: 'basic' } });
      await settle();
      expect(stageNames()).toEqual(['Applicant', 'Basic']);
      expect(within(sidebar()).queryByText('Pro')).toBeNull();
    });

    // Branches on `note`, a plain string, so the answer can be typed. The `plan` fixture above is a oneOf, which
    // renders a Base UI Combobox — `fireEvent.change` does not move one (CLAUDE.md records the interaction it
    // needs), so driving this through `plan` would assert nothing while appearing to pass.
    const typedBranching = flow(
      [
        stage('s1', 'Applicant', [form('Contact', ['note'])]),
        el({
          type: 'Condition',
          label: 'Which plan',
          options: {
            id: 'x',
            criteria: [{ id: 'c1', field: 'note', operator: 'equals', value: 'pro' }],
          },
        }),
        stage('s2', 'Pro', [form('Pro form')]),
        stage('s3', 'Basic', [form('Basic form')]),
      ],
      { edges: [edge('e1', 's1', 'x'), edge('e2', 'x', 's2', 'c1'), edge('e3', 'x', 's3')] },
    );

    it('re-projects as the answer is given and then changed', async () => {
      renderFlow({ uischema: typedBranching });
      await settle();
      // `note` is optional, so while blank the default branch is the route (rule 10f).
      expect(stageNames()).toEqual(['Applicant', 'Basic']);

      const note = screen.getByRole('textbox', { name: /^Note/ });
      fireEvent.change(note, { target: { value: 'pro' } });
      await waitFor(() => expect(stageNames()).toEqual(['Applicant', 'Pro']));

      // Changing it drops the branch no longer taken — the user's "drop it immediately" decision.
      fireEvent.change(note, { target: { value: 'something else' } });
      await waitFor(() => expect(stageNames()).toEqual(['Applicant', 'Basic']));
    });
  });

  describe('the rail chrome (rules 9b-9e)', () => {
    it('heads the rail "Steps" and lists the steps in a bordered, unpadded list', async () => {
      const { container } = renderFlow();
      await settle();
      expect(within(sidebar()).getByText('Steps')).toBeInTheDocument();
      const list = container.querySelector('[data-slot="runner-step-list"]');
      expect(list).toHaveClass('rounded-md', 'border');
      // Rule 9h: it fits its rows rather than filling the rail, and scrolls when they outgrow it.
      expect(list).not.toHaveClass('flex-1');
      expect(list).toHaveClass('min-h-0', 'overflow-y-auto', 'm-3');
      // Rule 9f: the rows sit flush against the border — no padding between them.
      expect(list?.className).not.toMatch(/(^|\s)p[xy]?-/);
      // Rule 9c: the line down the left is the rows' own borders stacked, so the list must set NO gap —
      // a gap would break that line into dashes.
      expect(list?.className).not.toMatch(/(^|\s)gap-/);
    });

    it('numbers each step and captions it "Step n" above the stage name (rule 9d)', async () => {
      renderFlow();
      await settle();
      const first = stageRows()[0];
      expect(first).toHaveTextContent('Step 1');
      expect(first?.querySelector('[data-slot="runner-stage-name"]')).toHaveTextContent(
        'Applicant',
      );
    });

    it('collapses to numerals only, hiding names and Forms, and expands again (rule 9e)', async () => {
      const { container } = renderFlow();
      await settle();
      const rail = () => container.querySelector('[data-slot="runner-sidebar"]');
      expect(rail).not.toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Collapse steps' }));

      expect(within(sidebar()).queryByText('Steps')).toBeNull();
      expect(sidebar().querySelector('[data-slot="runner-stage-name"]')).toBeNull();
      // Rule 9e: the current stage's Forms are withheld too, so collapsed means EVERY label is hidden.
      expect(sidebar().querySelector('[data-slot="runner-stage-form"]')).toBeNull();
      // The step is still reachable: the numeral keeps an accessible name of its own.
      expect(within(sidebar()).getByRole('button', { name: 'Step 1: Applicant' })).toBeEnabled();

      // Rule 9h: the collapsed rail keeps a smaller margin around the list.
      expect(container.querySelector('[data-slot="runner-step-list"]')).toHaveClass('m-1');
      fireEvent.click(screen.getByRole('button', { name: 'Expand steps' }));
      expect(within(sidebar()).getByText('Steps')).toBeInTheDocument();
      expect(sidebar().querySelector('[data-slot="runner-stage-name"]')).not.toBeNull();
    });
  });

  describe('gating (rules 24-28)', () => {
    it("blocks Next on the current Form's own errors, not the document's (rule 24)", async () => {
      renderFlow();
      await settle();
      // `name` is required and empty, and it belongs to the Form on screen.
      await waitFor(() => expect(nextButton()).toBeDisabled());
      fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), {
        target: { value: 'Ada' },
      });
      await waitFor(() => expect(nextButton()).toBeEnabled());
    });

    it('lets Next through when another Form elsewhere is incomplete', async () => {
      // The required field lives in the SECOND stage; the first must not be blocked by it.
      const later = flow(
        [
          stage('s1', 'Applicant', [form('Contact', ['note'])]),
          stage('s2', 'Review', [form('Decision', ['name'])]),
        ],
        {
          edges: [edge('e1', 's1', 's2')],
        },
      );
      renderFlow({ uischema: later });
      await settle();
      await waitFor(() => expect(nextButton()).toBeEnabled());
    });

    it('allows the sidebar to return to a visited stage (rule 25)', async () => {
      renderFlow({ initial: { name: 'Ada' } });
      await settle();
      await waitFor(() => expect(nextButton()).toBeEnabled());
      fireEvent.click(nextButton());
      await waitFor(() => expect(stageButton('Applicant')).toBeEnabled());
      // Having been there, it can be returned to.
      fireEvent.click(stageButton('Applicant'));
      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: /^Name/ })).toBeInTheDocument(),
      );
    });

    it('locks an upcoming stage, saying it is upcoming, until Next reaches it (rule 25c)', async () => {
      renderFlow({ initial: { name: 'Ada' } });
      await settle();
      const review = stageButton('Review');
      expect(review).toBeDisabled();
      expect(review).toHaveAttribute('aria-disabled', 'true');
      // Never by colour alone.
      expect(review).toHaveTextContent('upcoming');

      await waitFor(() => expect(nextButton()).toBeEnabled());
      fireEvent.click(nextButton());

      await waitFor(() => expect(stageButton('Review')).toHaveAttribute('aria-current', 'step'));
      expect(stageButton('Review')).toBeEnabled();
      expect(stageButton('Review')).not.toHaveTextContent('upcoming');
    });

    it('always allows Back, and never validates on it (rule 26)', async () => {
      renderFlow({ initial: { name: 'Ada' } });
      await settle();
      expect(backButton()).toBeDisabled();
      await waitFor(() => expect(nextButton()).toBeEnabled());
      fireEvent.click(nextButton());
      await waitFor(() => expect(backButton()).toBeEnabled());

      fireEvent.click(backButton());
      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: /^Name/ })).toBeInTheDocument(),
      );
    });

    it('blocks Submit on any error in the document, including one no Form owns (rules 27, 32)', async () => {
      // `hidden` is required by the schema but bound by NO Control, so no Form owns its error (rule 32).
      // That is precisely the case rule 27 exists for: it blocks Next nowhere, yet Submit must still refuse it,
      // or the form would be submitted with nothing having gated it.
      //
      // And an unowned error is the ONLY document-level error a citizen can carry to the end: there is no way to
      // reach Submit with a broken field in an earlier Form, because rule 24 blocks Next on exactly that.
      const withUnowned: JsonSchema = {
        ...schema,
        properties: { ...schema.properties, hidden: { type: 'string' } },
        required: ['name', 'hidden'],
      };
      renderFlow({ documentSchema: withUnowned, initial: { name: 'Ada' } });
      await settle();

      // Next is unblocked — the Form on screen owns no error.
      await waitFor(() => expect(nextButton()).toBeEnabled());
      fireEvent.click(nextButton());

      // The last stage offers Submit, and it is refused because the document does not validate.
      const submit = await screen.findByRole('button', { name: 'Submit' });
      await waitFor(() => expect(submit).toBeDisabled());
    });

    it('shows Submit instead of Next at the end of the flow (rule 16)', async () => {
      renderFlow({ initial: { name: 'Ada' } });
      await settle();
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
      await waitFor(() => expect(nextButton()).toBeEnabled());
      fireEvent.click(nextButton());
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument(),
      );
      expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    });
  });

  describe('conditions at fill time', () => {
    const branching = flow(
      [
        stage('s1', 'Applicant', [form('Contact', ['plan'])]),
        el({
          type: 'Condition',
          label: 'Which plan',
          options: {
            id: 'x',
            criteria: [{ id: 'c1', field: 'plan', operator: 'equals', value: 'pro' }],
          },
        }),
        stage('s2', 'Pro', [form('Pro form')]),
        stage('s3', 'Basic', [form('Basic form')]),
      ],
      { edges: [edge('e1', 's1', 'x'), edge('e2', 'x', 's2', 'c1'), edge('e3', 'x', 's3')] },
    );

    it('follows the branch the answers select when advancing', async () => {
      renderFlow({ uischema: branching, initial: { plan: 'pro' } });
      await settle();
      await waitFor(() => expect(nextButton()).toBeEnabled());
      fireEvent.click(nextButton());
      await waitFor(() =>
        expect(
          sidebar().querySelector('[data-slot="runner-stage"][data-current]'),
        ).toHaveTextContent('Pro'),
      );
    });

    it('re-resolves the branch when an upstream answer changes', async () => {
      renderFlow({ uischema: branching, initial: { plan: 'basic' } });
      await settle();
      await waitFor(() => expect(nextButton()).toBeEnabled());
      fireEvent.click(nextButton());
      // No criterion matches, so the default path is taken.
      await waitFor(() =>
        expect(
          sidebar().querySelector('[data-slot="runner-stage"][data-current]'),
        ).toHaveTextContent('Basic'),
      );
    });
  });

  describe('the renderer entry (rules 40-43, 46)', () => {
    it('renders the runner UI for a Flow instead of "Flows can\'t be filled in yet."', async () => {
      const { container } = renderFlow();
      await settle();
      expect(screen.queryByRole('status')).toBeNull();
      expect(container.querySelector('[data-slot="fill-flow"]')).not.toBeNull();
    });

    it('deletes FLOW_UNSUPPORTED_MESSAGE, amending doc 195 rule 19 and doc 199 rule 23', () => {
      const source = readFileSync(
        resolve(import.meta.dirname, '../src/renderers/xyflow/flow-elements.ts'),
        'utf8',
      );
      expect(source).not.toMatch(/export const FLOW_UNSUPPORTED_MESSAGE/);
    });

    it('is navigable with no port, holding its own position — the studio preview case (rule 40)', async () => {
      // Rendered through renderers/default directly, with no FormRunner and so no RunnerProvider.
      const { container } = render(<JsonFormsHarness uischema={TWO_STAGE} />);
      await settle();
      expect(container.querySelector('[data-slot="runner-sidebar"]')).not.toBeNull();
      expect(await screen.findByRole('textbox', { name: /^Name/ })).toBeInTheDocument();
    });

    it('leaves FillStage unchanged: a Stage outside a Flow is still a placement error (rule 41)', async () => {
      const { container } = render(
        <JsonFormsHarness
          uischema={el({ type: 'VerticalLayout', elements: [stage('s1', 'Loose')] })}
        />,
      );
      await settle();
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('A Stage can only be placed in a Flow.');
      expect(alert).toHaveAttribute('data-slot', 'stage-placement-error');
      expect(container.querySelector('[data-slot="fill-flow"]')).toBeNull();
    });

    it('imports only the pure modules, keeping the renderers-default-flow pin green (rule 42)', () => {
      const source = readFileSync(
        resolve(import.meta.dirname, '../src/renderers/default/fill-flow.tsx'),
        'utf8',
      );
      expect(source).not.toMatch(/from ['"]@xyflow\//);
      expect(source).not.toMatch(
        /from ['"][^'"]*xyflow\/(index|flow-renderer|stage-node|stage-renderer|flow-context|flow-nodes)['"]/,
      );
      expect(source).toMatch(/from ['"]\.\.\/xyflow\/flow-elements['"]/);
    });

    it('keeps defaults.layoutRenderers at 6 entries — the Flow entry is replaced, not added (rule 43)', () => {
      expect(defaults.layoutRenderers).toHaveLength(6);
    });
  });
});

/** Renders a document through `renderers/default` alone — no runner, so the Flow entry runs portless (rule 40). */
function JsonFormsHarness({ uischema }: { uischema: UISchemaElement }) {
  const [data, setData] = useState<Record<string, unknown>>({});
  return (
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={[
        ...defaults.controlRenderers,
        ...defaults.displayRenderers,
        ...defaults.layoutRenderers,
      ]}
      cells={defaults.cells}
      onChange={({ data: next }) => setData(next as Record<string, unknown>)}
    />
  );
}
