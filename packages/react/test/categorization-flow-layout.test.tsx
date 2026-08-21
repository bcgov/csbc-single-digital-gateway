import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderers } from '../src/jsonforms-renderers';
import {
  CategorizationLayoutRenderer,
  categorizationTester,
} from '../src/jsonforms-renderers/layouts/categorization-layout';
import {
  CategorizationFlowLayoutRenderer,
  categorizationFlowTester,
} from '../src/jsonforms-renderers/layouts/flow/categorization-flow-layout';
import {
  FlowActionProvider,
  type FlowActions,
} from '../src/jsonforms-renderers/layouts/flow/flow-actions-context';
import {
  FlowStepProvider,
  type FlowStepControl,
} from '../src/jsonforms-renderers/layouts/flow/flow-step-context';
import { displayRenderers } from '../src/jsonforms-renderers-display';

/**
 * Feature 176 — the Categorization "flow" layout renderer.
 *
 * Covers dispatch (rank 2 over the rank-1 tabs renderer), the content pane, the step rail, and the
 * injected save bar.
 */

const schema: JsonSchema = {
  type: 'object',
  properties: {
    details: {
      type: 'object',
      properties: {
        a: { type: 'string', minLength: 1 },
        b: { type: 'string', minLength: 1 },
        c: { type: 'string', minLength: 1 },
      },
      required: ['a', 'b'],
    },
  },
};

const testerContext = { rootSchema: schema, config: {} };

const control = (property: string, label: string) => ({
  type: 'Control',
  scope: `#/properties/details/properties/${property}`,
  label,
});

const category = (label: string, property: string, description?: string) => ({
  type: 'Category',
  label,
  ...(description === undefined ? {} : { options: { description } }),
  elements: [control(property, `${label} field`)],
});

/** `variant: null` authors NO `options` at all — the shape every Categorization has today. */
function flowUischema({
  variant = 'flow',
  label,
  elements,
}: {
  variant?: string | null;
  label?: string;
  elements?: unknown[];
} = {}): UISchemaElement {
  return {
    type: 'Categorization',
    ...(label === undefined ? {} : { label }),
    ...(variant === null ? {} : { options: { variant } }),
    elements: elements ?? [
      category('Overview', 'a', 'Who the service is for'),
      category('Details', 'b'),
      category('Extras', 'c'),
    ],
  } as unknown as UISchemaElement;
}

/** All three fields filled — no validation errors anywhere. */
const validData = () => ({ details: { a: 'x', b: 'y', c: 'z' } });

function renderFlow({
  uischema = flowUischema(),
  data = validData(),
  actions,
  stepControl,
  registry = renderers,
}: {
  uischema?: UISchemaElement;
  data?: Record<string, unknown>;
  actions?: FlowActions;
  stepControl?: FlowStepControl;
  registry?: typeof renderers;
} = {}) {
  const form = (
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={registry}
      cells={[]}
      validationMode="ValidateAndShow"
      onChange={() => {}}
    />
  );
  const withActions =
    actions === undefined ? form : <FlowActionProvider value={actions}>{form}</FlowActionProvider>;
  return render(
    stepControl === undefined ? (
      withActions
    ) : (
      <FlowStepProvider value={stepControl}>{withActions}</FlowStepProvider>
    ),
  );
}

const stubControl = (overrides: Partial<FlowStepControl> = {}): FlowStepControl => ({
  stepId: null,
  onStepChange: vi.fn(),
  ...overrides,
});

const stubActions = (overrides: Partial<FlowActions> = {}): FlowActions => ({
  onSave: vi.fn(),
  onExit: vi.fn(),
  ...overrides,
});

const rail = () => screen.getByRole('navigation', { name: 'Form steps' });
// Scoped to the <ol>, NOT the whole <nav> — the rail's header bar carries the collapse control,
// so `within(rail()).getAllByRole('button')` would lead with it.
const stepButtons = () => within(within(rail()).getByRole('list')).getAllByRole('button');

describe('flow layout — dispatch', () => {
  it("matches a Categorization carrying options.variant === 'flow' at rank 2", () => {
    expect(categorizationFlowTester(flowUischema(), schema, testerContext)).toBe(2);
  });

  it('does not match a Categorization with no options (falls through to the tabs renderer)', () => {
    const plain = flowUischema({ variant: null });

    expect(categorizationFlowTester(plain, schema, testerContext)).toBe(-1);
    // The tabs renderer still claims it, so nothing authored to date changes behaviour.
    expect(categorizationTester(plain, schema, testerContext)).toBe(1);
  });

  it('does not match an unrecognised variant', () => {
    for (const variant of ['stepper', 'FLOW', '']) {
      expect(categorizationFlowTester(flowUischema({ variant }), schema, testerContext)).toBe(-1);
    }
  });

  it('does not match a non-Categorization element carrying the same option', () => {
    const group = {
      type: 'Group',
      options: { variant: 'flow' },
      elements: [],
    } as unknown as UISchemaElement;

    expect(categorizationFlowTester(group, schema, testerContext)).toBe(-1);
  });

  it('renders the flow layout (not tabs) through the editable `renderers` registry', () => {
    renderFlow();

    expect(rail()).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('is registered in the FORM renderer set, above the tabs entry', () => {
    expect(renderers).toContainEqual({
      tester: categorizationFlowTester,
      renderer: CategorizationFlowLayoutRenderer,
    });
    expect(renderers).toContainEqual({
      tester: categorizationTester,
      renderer: CategorizationLayoutRenderer,
    });
  });

  it('still renders TABS for a flow-variant Categorization through `displayRenderers`', () => {
    renderFlow({ registry: displayRenderers as unknown as typeof renderers });

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Form steps' })).toBeNull();
  });

  it('renders an explicit empty message for a Categorization with no Category children', () => {
    renderFlow({
      uischema: flowUischema({
        elements: [{ type: 'Control', scope: '#/properties/details/properties/a' }],
      }),
    });

    expect(screen.getByText('This section has no steps to show.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Form steps' })).toBeNull();
  });
});

describe('flow layout — content pane', () => {
  it("renders the current category's label as the header title", () => {
    renderFlow();

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('renders category.options.description as the header description', () => {
    renderFlow();

    expect(screen.getByText('Who the service is for')).toBeInTheDocument();
  });

  it('omits the description element entirely when the category has none', async () => {
    const user = userEvent.setup();
    renderFlow();

    // Step 2 ("Details") was authored without a description.
    await user.click(stepButtons()[1] as HTMLElement);

    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
    expect(screen.queryByText('Who the service is for')).toBeNull();
  });

  it("dispatches only the current category's child elements", async () => {
    const user = userEvent.setup();
    renderFlow();

    expect(screen.getByLabelText(/Overview field/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Details field/)).toBeNull();

    await user.click(stepButtons()[1] as HTMLElement);

    expect(screen.getByLabelText(/Details field/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Overview field/)).toBeNull();
  });

  it('preserves data entered on one step when navigating away and back', async () => {
    const user = userEvent.setup();
    renderFlow({ data: { details: { a: '', b: 'y', c: 'z' } } });

    await user.type(screen.getByLabelText(/Overview field/), 'typed');
    await user.click(stepButtons()[1] as HTMLElement);
    await user.click(stepButtons()[0] as HTMLElement);

    await waitFor(() => expect(screen.getByLabelText(/Overview field/)).toHaveValue('typed'));
  });
});

describe('flow layout — step rail', () => {
  it('renders one nav item per category, labelled "Step <n>" above the category label', () => {
    renderFlow();
    const items = stepButtons();

    expect(items).toHaveLength(3);
    expect(within(items[0] as HTMLElement).getByText('Step 1')).toBeInTheDocument();
    expect(within(items[0] as HTMLElement).getByText('Overview')).toBeInTheDocument();
    expect(within(items[2] as HTMLElement).getByText('Step 3')).toBeInTheDocument();
    expect(within(items[2] as HTMLElement).getByText('Extras')).toBeInTheDocument();
  });

  it('marks the current nav item with aria-current="step"', async () => {
    const user = userEvent.setup();
    renderFlow();

    expect(stepButtons()[0]).toHaveAttribute('aria-current', 'step');

    await user.click(stepButtons()[1] as HTMLElement);

    expect(stepButtons()[0]).not.toHaveAttribute('aria-current');
    expect(stepButtons()[1]).toHaveAttribute('aria-current', 'step');
  });

  it('switches the content pane when a nav item is activated', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(stepButtons()[2] as HTMLElement);

    expect(screen.getByRole('heading', { name: 'Extras' })).toBeInTheDocument();
  });

  it('gives upcoming steps the grey border and the current step the bcgov-blue border', () => {
    renderFlow();
    const items = stepButtons();

    expect(items[0]).toHaveClass('border-bcgov-blue');
    expect(items[1]).toHaveClass('border-border');
    expect(items[2]).toHaveClass('border-border');
  });

  it('gives a previous step with no errors the success border', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(stepButtons()[2] as HTMLElement);

    expect(stepButtons()[0]).toHaveClass('border-success-border');
    expect(stepButtons()[1]).toHaveClass('border-success-border');
  });

  it('gives a previous step owning an error the danger border', async () => {
    const user = userEvent.setup();
    // `details.a` is required and empty → step 1 owns an error.
    renderFlow({ data: { details: { a: '', b: 'y', c: 'z' } } });

    await user.click(stepButtons()[2] as HTMLElement);

    await waitFor(() => expect(stepButtons()[0]).toHaveClass('border-danger-border'));
    expect(stepButtons()[1]).toHaveClass('border-success-border');
  });

  it('exposes a visually-hidden status word so the rail does not depend on colour alone', async () => {
    const user = userEvent.setup();
    renderFlow({ data: { details: { a: '', b: 'y', c: 'z' } } });

    await user.click(stepButtons()[2] as HTMLElement);

    await waitFor(() =>
      expect(
        within(stepButtons()[0] as HTMLElement).getByText('needs attention'),
      ).toBeInTheDocument(),
    );
    expect(within(stepButtons()[1] as HTMLElement).getByText('complete')).toBeInTheDocument();
  });

  it('renders a header bar above the steps, with the collapse control on its right', () => {
    renderFlow();
    const nav = rail();
    const heading = within(nav).getByRole('heading', { name: 'Steps' });
    const toggle = within(nav).getByRole('button', { name: 'Collapse step list' });

    // Same bar, and it precedes the step list.
    const bar = heading.parentElement as HTMLElement;
    expect(bar).toContainElement(toggle);
    expect(bar.compareDocumentPosition(within(nav).getByRole('list'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('separates the rail from the content pane with a right border', () => {
    renderFlow();

    expect(rail()).toHaveClass('lg:border-r', 'border-border');
  });

  it("titles the header bar with the Categorization's own label when authored", () => {
    renderFlow({ uischema: flowUischema({ label: 'Service description' }) });

    expect(rail()).toHaveTextContent('Service description');
  });

  it('keeps the collapse control in the header bar when collapsed, dropping the title', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole('button', { name: 'Collapse step list' }));

    expect(within(rail()).queryByRole('heading', { name: 'Steps' })).toBeNull();
    expect(within(rail()).getByRole('button', { name: 'Expand step list' })).toBeInTheDocument();
  });

  it('collapses to an icon rail, keeping each item an accessible name', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole('button', { name: 'Collapse step list' }));

    // The visible label is gone, but the button still resolves by its accessible name.
    expect(within(rail()).queryByText('Overview')).toBeNull();
    expect(within(rail()).getByRole('button', { name: 'Overview' })).toBeInTheDocument();
  });

  it('restores the labels when expanded again', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole('button', { name: 'Collapse step list' }));
    await user.click(screen.getByRole('button', { name: 'Expand step list' }));

    expect(within(rail()).getByText('Overview')).toBeInTheDocument();
    expect(within(rail()).getByText('Step 1')).toBeInTheDocument();
  });
});

describe('flow layout — save bar without a FlowActionProvider', () => {
  it('renders Back / Next and no Save affordance', () => {
    renderFlow();

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save/ })).toBeNull();
  });

  it('renders without throwing (the no-provider degradation is the invariant)', () => {
    expect(() => renderFlow()).not.toThrow();
  });

  it('still advances through steps with Next', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
  });

  it('offers no forward affordance on the last step (a Done button would do nothing)', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(stepButtons()[2] as HTMLElement);

    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Save/ })).toBeNull();
  });
});

describe('flow layout — save bar with a FlowActionProvider', () => {
  it('disables Back on the first step', () => {
    renderFlow({ actions: stubActions() });

    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  it('navigates back without calling onSave', async () => {
    const user = userEvent.setup();
    const actions = stubActions();
    renderFlow({ actions });

    await user.click(stepButtons()[1] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(actions.onSave).not.toHaveBeenCalled();
  });

  it('calls onSave then advances when Save & next is activated', async () => {
    const user = userEvent.setup();
    const actions = stubActions();
    renderFlow({ actions });

    await user.click(screen.getByRole('button', { name: 'Save & next' }));

    expect(actions.onSave).toHaveBeenCalledWith(validData());
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument(),
    );
  });

  it('keeps the user on the current step when onSave rejects', async () => {
    const user = userEvent.setup();
    const actions = stubActions({ onSave: vi.fn().mockRejectedValue(new Error('nope')) });
    renderFlow({ actions });

    await user.click(screen.getByRole('button', { name: 'Save & next' }));

    await waitFor(() => expect(actions.onSave).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('renders Save & exit on the last step instead of Save & next', async () => {
    const user = userEvent.setup();
    renderFlow({ actions: stubActions() });

    await user.click(stepButtons()[2] as HTMLElement);

    expect(screen.getByRole('button', { name: 'Save & exit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save & next' })).toBeNull();
  });

  it('calls onSave then onExit when Save & exit is activated', async () => {
    const user = userEvent.setup();
    const actions = stubActions();
    renderFlow({ actions });

    await user.click(stepButtons()[2] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Save & exit' }));

    await waitFor(() => expect(actions.onExit).toHaveBeenCalledTimes(1));
    expect(actions.onSave).toHaveBeenCalledWith(validData());
  });

  it('does not call onExit when the final onSave rejects', async () => {
    const user = userEvent.setup();
    const actions = stubActions({ onSave: vi.fn().mockRejectedValue(new Error('nope')) });
    renderFlow({ actions });

    await user.click(stepButtons()[2] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Save & exit' }));

    await waitFor(() => expect(actions.onSave).toHaveBeenCalled());
    expect(actions.onExit).not.toHaveBeenCalled();
  });

  it('disables both save affordances while `saving` is true', async () => {
    const user = userEvent.setup();
    renderFlow({ actions: stubActions({ saving: true }) });

    expect(screen.getByRole('button', { name: 'Save & next' })).toBeDisabled();

    await user.click(stepButtons()[2] as HTMLElement);
    expect(screen.getByRole('button', { name: 'Save & exit' })).toBeDisabled();
  });

  it('disables saving while the CURRENT step owns a validation error', () => {
    // `details.a` is required and empty — and step 1 is the one on screen.
    renderFlow({ actions: stubActions(), data: { details: { a: '', b: 'y', c: 'z' } } });

    expect(screen.getByRole('button', { name: 'Save & next' })).toBeDisabled();
  });

  it('leaves saving ENABLED when only a LATER step owns an error (per-step gating)', () => {
    // `details.b` (step 2) is required and empty; step 1 is valid, so step 1 must still save.
    renderFlow({ actions: stubActions(), data: { details: { a: 'x', b: '', c: 'z' } } });

    expect(screen.getByRole('button', { name: 'Save & next' })).toBeEnabled();
  });
});

/**
 * Feature 177 — the `FlowStepProvider` port: the host controls which step is shown.
 *
 * With the port mounted the layout is CONTROLLED — it never sets its own step, it reports every
 * requested change through `onStepChange`, and it reports its current-step validity through
 * `onBlockedChange` (a flag only the layout can compute, needed by a dialog the host renders).
 */
describe('flow layout — step control port', () => {
  it('renders the step named by the port rather than the first one', () => {
    renderFlow({ stepControl: stubControl({ stepId: 'details' }) });

    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
  });

  it('falls back to the first step when the port carries a null id', () => {
    renderFlow({ stepControl: stubControl({ stepId: null }) });

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('falls back to the first step when the port carries an unknown id', () => {
    // What a link shared before the category was relabelled looks like.
    renderFlow({ stepControl: stubControl({ stepId: 'renamed-away' }) });

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('reports a rail jump through onStepChange instead of moving itself', async () => {
    const user = userEvent.setup();
    const stepControl = stubControl();
    renderFlow({ stepControl });

    await user.click(stepButtons()[2] as HTMLElement);

    expect(stepControl.onStepChange).toHaveBeenCalledWith('extras');
    // Still on step 1: the host owns the move, so nothing changes until it sends a new stepId.
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('reports Back and Next through onStepChange', async () => {
    const user = userEvent.setup();
    const stepControl = stubControl({ stepId: 'details' });
    renderFlow({ stepControl });

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(stepControl.onStepChange).toHaveBeenLastCalledWith('extras');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(stepControl.onStepChange).toHaveBeenLastCalledWith('overview');
  });

  it('reports the next step through onStepChange after Save & next resolves', async () => {
    const user = userEvent.setup();
    const stepControl = stubControl({ stepId: 'overview' });
    const actions = stubActions();
    renderFlow({ actions, stepControl });

    await user.click(screen.getByRole('button', { name: 'Save & next' }));

    await waitFor(() => expect(stepControl.onStepChange).toHaveBeenCalledWith('details'));
    expect(actions.onSave).toHaveBeenCalledWith(validData());
  });

  it('reports onBlockedChange(true) when the current step owns a validation error', () => {
    const onBlockedChange = vi.fn();
    renderFlow({
      stepControl: stubControl({ onBlockedChange }),
      data: { details: { b: 'y', c: 'z' } },
    });

    expect(onBlockedChange).toHaveBeenCalledWith(true);
  });

  it('reports onBlockedChange(false) once the current step validates', async () => {
    const user = userEvent.setup();
    const onBlockedChange = vi.fn();
    renderFlow({
      stepControl: stubControl({ onBlockedChange }),
      data: { details: { b: 'y', c: 'z' } },
    });
    expect(onBlockedChange).toHaveBeenLastCalledWith(true);

    await user.type(screen.getByLabelText(/Overview field/), 'filled');

    await waitFor(() => expect(onBlockedChange).toHaveBeenLastCalledWith(false));
  });

  it('only reports onBlockedChange when the flag actually flips', () => {
    const onBlockedChange = vi.fn();
    renderFlow({ stepControl: stubControl({ onBlockedChange }) });

    // An inline provider `value` is a fresh object every render; the layout must still call the
    // host once, not once per render.
    expect(onBlockedChange).toHaveBeenCalledTimes(1);
    expect(onBlockedChange).toHaveBeenCalledWith(false);
  });

  it('keeps its own local step state when no provider is mounted', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(stepButtons()[2] as HTMLElement);

    expect(screen.getByRole('heading', { name: 'Extras' })).toBeInTheDocument();
  });
});
