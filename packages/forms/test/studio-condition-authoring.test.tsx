import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NO_UPSTREAM_FIELDS_HINT } from '../src/renderers/xyflow/condition-renderer';
import { FormStudio } from '../src/studio';
import { inspectorForm } from '../src/studio/inspector/inspector-form';
import { createElementIds } from '../src/studio/layout/element-ids';
import { sections } from './inspector-fixtures';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 199 rules 24, 25, 29-32 — authoring a Condition in the Form Studio: inserting one from a +,
// editing its criteria on the card, and how the studio treats it.

useXyflowJsdom();

const schema: JsonSchema = {
  type: 'object',
  properties: {
    province: {
      type: 'string',
      oneOf: [
        { const: 'bc', title: 'BC' },
        { const: 'ab', title: 'Alberta' },
      ],
    },
    age: { type: 'number' },
    notes: { type: 'string' },
  },
};

const el = (element: object) => element as UISchemaElement;

const control = (key: string, label: string) => ({
  type: 'Control',
  scope: `#/properties/${key}`,
  label,
});

const stage = (id: string, label: string, controls: object[] = []) =>
  el({
    type: 'Stage',
    label,
    options: { id },
    elements: [
      { type: 'Form', label: `Form ${id}`, options: { id: `f-${id}` }, elements: controls },
    ],
  });

const condition = (id: string, criteria: object[] = [], label = 'Route') =>
  el({ type: 'Condition', label, options: { id, criteria } });

const flowOf = (elements: object[], edges: object[] = []) =>
  el({ type: 'Flow', elements, options: { edges } });

const criterion = (id: string, patch: object = {}) => ({
  id,
  field: 'province',
  operator: 'equals',
  value: 'bc',
  ...patch,
});

/** s1 (Province, Age) → c1 → s2 (Notes). c1's only edge is its default path, so the Flow has no problem. */
const branched = (criteria: object[] = [], extraEdges: object[] = []) =>
  flowOf(
    [
      stage('s1', 'Applicant', [control('province', 'Province'), control('age', 'Age')]),
      condition('c1', criteria),
      stage('s2', 'Review', [control('notes', 'Notes')]),
    ],
    [
      { id: 'e1', source: 's1', target: 'c1' },
      { id: 'e2', source: 'c1', target: 's2' },
      ...extraEdges,
    ],
  );

/** s1 → s2, so s2 is the only leaf. */
const CHAIN = flowOf(
  [stage('s1', 'Applicant', [control('province', 'Province')]), stage('s2', 'Review')],
  [{ id: 'e1', source: 's1', target: 's2' }],
);

function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}

const centre = () =>
  required(document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]'), 'centre');
const nodeOf = (id: string) =>
  required(document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`), `node ${id}`);
const nodeIds = () =>
  [...document.querySelectorAll('.react-flow__node')].map((node) => node.getAttribute('data-id'));
const conditionCards = () => [...centre().querySelectorAll('[data-slot="condition-card"]')];
const stageCount = () => centre().querySelectorAll('[data-slot="stage-card"]').length;
const edgeCount = () => document.querySelectorAll('[data-testid^="rf__edge-"]').length;
const rows = () => [
  ...centre().querySelectorAll<HTMLElement>('[data-slot="condition-criterion-row"]'),
];
const trail = () => screen.getByRole('navigation', { name: 'Element path' });
const currentCrumb = () => trail().querySelector('[aria-current="page"]')?.textContent ?? null;

/**
 * TEST TRAP (doc 198): xyflow keeps a node hidden until measured and `test/xyflow-jsdom` reports through an
 * ASYNCHRONOUS ResizeObserver, so a node's controls are in the DOM before they are in the accessibility tree.
 * Always reach them through a `findBy*` query.
 */
const buttonIn = (nodeId: string, name: string) =>
  within(nodeOf(nodeId)).findByRole('button', { name });

/**
 * Rule 24: a leaf or edge + opens a two-item menu rather than appending outright. Base UI portals the menu OUT
 * of the canvas, so its items are found on the whole document, never within the node.
 */
const chooseNode = async (trigger: HTMLElement, item: 'Stage' | 'Condition') => {
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('menuitem', { name: item }));
};

const openMenu = async (trigger: HTMLElement) => {
  fireEvent.click(trigger);
  await screen.findByRole('menuitem', { name: 'Stage' });
  return screen.getAllByRole('menuitem').map((item) => item.textContent);
};

/** The named picker of the `index`th criterion row. A native `<select>` takes the combobox role. */
const pickerIn = (row: HTMLElement, name: string) => within(row).getByRole('combobox', { name });
const optionsOf = (select: HTMLElement) =>
  within(select)
    .getAllByRole('option')
    .map((option) => option.textContent);

const renderStudio = (uischema: UISchemaElement) =>
  render(<FormStudio schema={schema} uischema={uischema} />);

/** Waits for the Condition card's controls to be measured into the accessibility tree. */
const addCriterionButton = () => buttonIn('c1', 'Add criterion');

/** The Condition's studio frame — what the selection port hovers, selects and hangs its actions off. */
const conditionFrame = () =>
  required(
    document.querySelector<HTMLElement>(
      '[data-slot="studio-element"][data-element-type="Condition"]',
    ),
    'condition frame',
  );
const press = (element: HTMLElement) => {
  fireEvent.pointerDown(element);
  fireEvent.pointerUp(element);
};
const confirmDelete = async (description: string) => {
  const dialog = await screen.findByRole('alertdialog');
  expect(dialog).toHaveTextContent(description);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
};

describe('inserting a Condition (rule 24)', () => {
  it('offers Stage and Condition from a leaf +', async () => {
    renderStudio(CHAIN);
    expect(await openMenu(await buttonIn('s2', 'Add a node'))).toEqual(['Stage', 'Condition']);
  });

  it('offers Stage and Condition from an edge +', async () => {
    renderStudio(CHAIN);
    await waitFor(() => expect(edgeCount()).toBe(1));
    const add = required(
      centre().querySelector<HTMLElement>('[data-slot="flow-edge-add"]'),
      'edge +',
    );
    expect(await openMenu(add)).toEqual(['Stage', 'Condition']);
  });

  it('offers Stage ONLY from the origin + of an empty Flow', async () => {
    renderStudio(flowOf([]));
    // A Condition with nothing upstream could hold no valid criterion (rule 26), so the origin + appends
    // a Stage outright — there is no menu to open at all.
    const origin = within(centre()).getByRole('button', { name: 'Add a stage' });
    expect(origin).toHaveAttribute('data-slot', 'flow-add');
    expect(origin).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(origin);

    await waitFor(() => expect(stageCount()).toBe(1));
    expect(screen.queryByRole('menuitem')).toBeNull();
    expect(conditionCards()).toHaveLength(0);
  });

  it('reaches both menu items by keyboard', async () => {
    renderStudio(CHAIN);
    const trigger = await buttonIn('s2', 'Add a node');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // TEST TRAP: jsdom does NOT synthesise a click from Enter on a button the way a browser does, so Enter
    // opens nothing here. ArrowDown is handled by the trigger's own keydown, which jsdom can drive.
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const items = await screen.findAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Stage', 'Condition']);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('appends a connected Condition and selects it', async () => {
    renderStudio(CHAIN);
    await waitFor(() => expect(edgeCount()).toBe(1));
    await chooseNode(await buttonIn('s2', 'Add a node'), 'Condition');

    await waitFor(() => expect(conditionCards()).toHaveLength(1));
    // Connected from the leaf it was added under, and selected like every other inserting gesture.
    await waitFor(() => expect(edgeCount()).toBe(2));
    expect(currentCrumb()).toBe('Condition 1');
    expect(conditionCards()[0]).toHaveTextContent('Condition 1');
  });

  it('gives the inserted Condition an id unique across Stages and Conditions (rule 15)', async () => {
    renderStudio(CHAIN);
    await chooseNode(await buttonIn('s2', 'Add a node'), 'Condition');
    await waitFor(() => expect(conditionCards()).toHaveLength(1));

    const ids = nodeIds();
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toContain('s1');
    expect(ids).toContain('s2');
  });
});

describe('editing criteria on the card (rules 25-26, 28)', () => {
  it('adds a complete criterion from the Add criterion row', async () => {
    renderStudio(branched());
    expect(rows()).toHaveLength(0);
    fireEvent.click(await addCriterionButton());

    // Rule 26: born complete — the first upstream field, that kind's first operator, and a real value.
    await waitFor(() => expect(rows()).toHaveLength(1));
    const row = required(rows()[0], 'criterion row');
    expect(pickerIn(row, 'Field')).toHaveValue('province');
    expect(pickerIn(row, 'Operator')).toHaveValue('equals');
    expect(pickerIn(row, 'Value')).toHaveValue('bc');
  });

  it('disables Add criterion with a hint when nothing is upstream', async () => {
    // The Condition is first in the flow: no Stage reaches it, so no answer exists to test.
    renderStudio(
      flowOf([condition('c1'), stage('s2', 'Review')], [{ id: 'e1', source: 'c1', target: 's2' }]),
    );

    const add = await addCriterionButton();
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('title', NO_UPSTREAM_FIELDS_HINT);
    expect(nodeOf('c1').querySelector('[data-slot="condition-no-fields"]')).toHaveTextContent(
      NO_UPSTREAM_FIELDS_HINT,
    );
  });

  it('offers only upstream fields in the field picker', async () => {
    renderStudio(branched([criterion('x')]));
    const row = required((await waitFor(() => rows()))[0], 'criterion row');

    // Province and Age are answered in s1, which reaches the Condition; Notes is in s2, which does not.
    expect(optionsOf(pickerIn(row, 'Field'))).toEqual(['Province', 'Age']);
  });

  it("offers only the field kind's operators in the operator picker", async () => {
    renderStudio(branched([criterion('x')]));
    const row = required((await waitFor(() => rows()))[0], 'criterion row');

    // Province is a choice (rule 1): no contains, no comparisons.
    expect(optionsOf(pickerIn(row, 'Operator'))).toEqual([
      'equals',
      'does not equal',
      'is empty',
      'is not empty',
    ]);

    // Age is a number, so switching the field switches the vocabulary with it (rule 28).
    fireEvent.change(pickerIn(row, 'Field'), { target: { value: 'age' } });
    await waitFor(() =>
      expect(optionsOf(pickerIn(required(rows()[0], 'row'), 'Operator'))).toContain(
        'is greater than',
      ),
    );
  });

  it("offers the field's choice options as the value for a choice field", async () => {
    renderStudio(branched([criterion('x')]));
    const row = required((await waitFor(() => rows()))[0], 'criterion row');
    expect(optionsOf(pickerIn(row, 'Value'))).toEqual(['BC', 'Alberta']);
  });

  it('hides the value control for an operator that needs none', async () => {
    renderStudio(branched([criterion('x')]));
    const row = required((await waitFor(() => rows()))[0], 'criterion row');
    expect(within(row).queryByRole('combobox', { name: 'Value' })).not.toBeNull();

    fireEvent.change(pickerIn(row, 'Operator'), { target: { value: 'isEmpty' } });
    await waitFor(() =>
      expect(
        within(required(rows()[0], 'row')).queryByRole('combobox', { name: 'Value' }),
      ).toBeNull(),
    );
  });

  it('removes a criterion and its edges from its row', async () => {
    // The criterion owns a branch to s2, alongside the default path to the same Stage.
    renderStudio(
      branched([criterion('x')], [{ id: 'e3', source: 'c1', target: 's2', sourceHandle: 'x' }]),
    );
    await waitFor(() => expect(edgeCount()).toBe(3));
    expect(rows()).toHaveLength(1);

    fireEvent.click(await buttonIn('c1', 'Remove criterion'));

    await waitFor(() => expect(rows()).toHaveLength(0));
    // Rule 27: the branch's edge goes with it, leaving s1 → c1 and the default c1 → s2.
    await waitFor(() => expect(edgeCount()).toBe(2));
  });
});

describe('wiring an output (rules 20, 29)', () => {
  it("appends a connected Stage from an unconnected output's +, carrying the criterion as sourceHandle", async () => {
    renderStudio(branched([criterion('x')]));
    const row = required((await waitFor(() => rows()))[0], 'criterion row');
    // The criterion's output leads nowhere yet, so the row carries its own +.
    const add = within(row).getByRole('button', { name: 'Add a stage' });

    fireEvent.click(add);
    await waitFor(() => expect(stageCount()).toBe(3));
    await waitFor(() => expect(edgeCount()).toBe(3));
    // The new edge leaves BY THE CRITERION, not by the default path: the criterion's output is now wired, so
    // its row's + is gone. Had the handle been dropped, the edge would have read as a second default and the
    // row would still be offering to wire itself.
    await waitFor(() =>
      expect(
        within(required(rows()[0], 'row')).queryByRole('button', { name: 'Add a stage' }),
      ).toBeNull(),
    );
  });

  it('keeps the sourceHandle when a criterion edge is split by the edge + (rule 29)', async () => {
    renderStudio(
      branched([criterion('x')], [{ id: 'e3', source: 'c1', target: 's2', sourceHandle: 'x' }]),
    );
    await waitFor(() => expect(edgeCount()).toBe(3));
    const row = required(rows()[0], 'criterion row');
    expect(within(row).queryByRole('button', { name: 'Add a stage' })).toBeNull();

    // Split the criterion's own edge. `insertStageBetween` RETARGETS it, so it keeps both its id and its handle.
    const adds = [...centre().querySelectorAll<HTMLElement>('[data-slot="flow-edge-add"]')];
    await chooseNode(required(adds.at(-1), 'edge +'), 'Stage');
    await waitFor(() => expect(stageCount()).toBe(3));

    // Still wired by the criterion: its row grows no + back.
    expect(
      within(required(rows()[0], 'row')).queryByRole('button', { name: 'Add a stage' }),
    ).toBeNull();
  });

  it('lets two criteria target the SAME Stage without either being dropped (rule 11)', async () => {
    renderStudio(
      branched(
        [criterion('x'), criterion('y', { value: 'ab' })],
        [
          { id: 'e3', source: 'c1', target: 's2', sourceHandle: 'x' },
          { id: 'e4', source: 'c1', target: 's2', sourceHandle: 'y' },
        ],
      ),
    );

    // Rule 11: identity is (source, sourceHandle, target), so neither branch reads as a duplicate.
    await waitFor(() => expect(edgeCount()).toBe(4));
    await waitFor(() => expect(rows()).toHaveLength(2));
    for (const row of rows())
      expect(within(row).queryByRole('button', { name: 'Add a stage' })).toBeNull();
  });
});

describe('studio integration (rules 30-32)', () => {
  it('names criteria and connections in the delete confirmation', async () => {
    renderStudio(branched([criterion('x')]));
    press(conditionFrame());
    const menu = await screen.findByRole('dialog', { name: 'Condition actions' });
    fireEvent.click(within(menu).getByRole('button', { name: 'Delete' }));

    // Rule 30: a Condition holds no children, so the wording names what actually goes with it.
    await confirmDelete(
      'This condition, its criteria and its connections will be removed from the flow.',
    );
    await waitFor(() => expect(conditionCards()).toHaveLength(0));
    // Its edges go with it (rule 27), leaving nothing joining the two Stages.
    await waitFor(() => expect(edgeCount()).toBe(0));
  });

  it('gives a Condition the Delete-only actions popover, like a Stage', async () => {
    renderStudio(branched());
    press(conditionFrame());

    const menu = await screen.findByRole('dialog', { name: 'Condition actions' });
    // Rule 31: Delete only — a Condition is not copied, exactly as a Stage is not.
    expect(
      within(menu)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Delete']);
  });

  it('keeps Condition content non-inert but pointer-events-none', async () => {
    renderStudio(branched([criterion('x')]));
    const content = required(
      conditionFrame().querySelector<HTMLElement>(':scope > [data-slot="studio-content"]'),
      'condition content',
    );
    // Rule 31: `inert` on the frame could not be undone below it, and the card's pickers must stay reachable.
    expect(content).not.toHaveAttribute('inert');
    expect(content).toHaveClass('pointer-events-none');

    expect(await addCriterionButton()).toHaveClass('nodrag', 'pointer-events-auto');
    const row = required(rows()[0], 'criterion row');
    // The row controls opt back in. NativeSelect puts its className on the WRAPPER, not the <select>.
    expect(pickerIn(row, 'Field').closest('[data-slot="native-select-wrapper"]')).toHaveClass(
      'nodrag',
      'pointer-events-auto',
    );
  });

  it('shows only the Label setting in the inspector for a selected Condition', () => {
    const ids = createElementIds();
    const uischema = branched([criterion('x')]);
    const conditionElement = required(
      (uischema as { elements?: UISchemaElement[] }).elements?.[1],
      'condition element',
    );
    const form = inspectorForm({ schema, uischema }, ids.idOf(conditionElement), ids);

    // Rule 32: criteria are authored on the card — the inspector cannot express a repeatable row.
    expect(sections(required(form, 'inspector form'))).toEqual([['General', ['label']]]);
  });
});
