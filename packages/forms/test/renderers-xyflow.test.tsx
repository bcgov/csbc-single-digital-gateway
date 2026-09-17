import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  NOT_APPLICABLE,
  type JsonSchema,
  type LayoutProps,
  type UISchemaElement,
} from '@jsonforms/core';
import { JsonForms, JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import * as ui from '../src/renderers-ui';
import * as xyflow from '../src/renderers-xyflow';
import { LayoutNestingContext } from '../src/renderers/gridstack/layout-nesting';
import { toFlowEdges } from '../src/renderers/xyflow/flow-nodes';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 195 rules 1-4, 6-11, 13-15b — @repo/forms/renderers/xyflow (Flow + Stage). Placement (rule 16) is in
// flow-placement.test.ts.
// Doc 198 rule 3: the canvas runs top-down, so the handles sit on the Top and Bottom faces.

useXyflowJsdom();

const root = resolve(import.meta.dirname, '..');
const schema: JsonSchema = { type: 'object', properties: {} };
const testerContext = { rootSchema: schema, config: {} };
const CATEGORIES = ['cells', 'controlRenderers', 'displayRenderers', 'layoutRenderers'] as const;

const el = (element: object) => element as UISchemaElement;
const form = (label?: string, elements: object[] = []) =>
  el({ type: 'Form', elements, ...(label === undefined ? {} : { label }) });
const stage = (id: unknown, elements: object[] = [form('Details')], extra: object = {}) =>
  el({ type: 'Stage', elements, options: { id }, ...extra });
const flow = (elements: object[], edges?: object[]) =>
  el({ type: 'Flow', elements, ...(edges ? { options: { edges } } : {}) });

/** A stand-in layout that, like every real layout, tells its children its kind (doc 194 rule 6). */
const NestingLayout = withJsonFormsLayoutProps(
  ({ uischema, schema: layoutSchema, path, renderers, cells }: LayoutProps) => (
    <LayoutNestingContext.Provider value="vertical">
      {((uischema as { elements?: UISchemaElement[] }).elements ?? []).map((child, index) => (
        <JsonFormsDispatch
          key={index}
          uischema={child}
          schema={layoutSchema}
          path={path}
          {...(renderers ? { renderers } : {})}
          {...(cells ? { cells } : {})}
        />
      ))}
    </LayoutNestingContext.Provider>
  ),
);

const RENDERERS = [
  ...ui.displayRenderers,
  ...xyflow.layoutRenderers,
  {
    tester: (u: UISchemaElement) => (u.type === 'VerticalLayout' ? 1 : -1),
    renderer: NestingLayout,
  },
];

const renderFlow = (uischema: UISchemaElement) =>
  render(
    <div style={{ width: '800px', height: '600px' }}>
      <JsonForms schema={schema} uischema={uischema} data={{}} renderers={RENDERERS} cells={[]} />
    </div>,
  );

const nodeIds = (container: HTMLElement) =>
  [...container.querySelectorAll('.react-flow__node')].map((node) => node.getAttribute('data-id'));
const nodeOf = (container: HTMLElement, id: string) => {
  const node = container.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`);
  if (!node) throw new Error(`missing node ${id}`);
  return node;
};

describe('renderers/xyflow set (rules 1-4)', () => {
  it('exports exactly cells, controlRenderers, displayRenderers ([]) and layoutRenderers [Flow, Stage, Condition]', () => {
    expect(Object.keys(xyflow).toSorted()).toEqual([...CATEGORIES]);
    expect(xyflow.cells).toEqual([]);
    expect(xyflow.controlRenderers).toEqual([]);
    expect(xyflow.displayRenderers).toEqual([]);
    // Doc 199 rule 17: the Condition joins Flow and Stage as a third layout entry.
    expect(xyflow.layoutRenderers).toHaveLength(3);
    expect(xyflow.layoutRenderers[0]?.tester({ type: 'Flow' }, schema, testerContext)).toBe(1);
    expect(xyflow.layoutRenderers[1]?.tester({ type: 'Stage' }, schema, testerContext)).toBe(1);
    expect(xyflow.layoutRenderers[2]?.tester({ type: 'Condition' }, schema, testerContext)).toBe(1);
  });

  it('ranks Flow, Stage and Condition at 1 by uischema type and matches nothing else', () => {
    const [flowEntry, stageEntry, conditionEntry] = xyflow.layoutRenderers;
    for (const type of [
      'Form',
      'Grid',
      'VerticalLayout',
      'HorizontalLayout',
      'Heading',
      'Control',
    ]) {
      expect(flowEntry?.tester({ type }, schema, testerContext), type).toBe(NOT_APPLICABLE);
      expect(stageEntry?.tester({ type }, schema, testerContext), type).toBe(NOT_APPLICABLE);
      expect(conditionEntry?.tester({ type }, schema, testerContext), type).toBe(NOT_APPLICABLE);
    }
    // No two of them ever match the same element, so none can tie at the top rank.
    expect(flowEntry?.tester({ type: 'Stage' }, schema, testerContext)).toBe(NOT_APPLICABLE);
    expect(flowEntry?.tester({ type: 'Condition' }, schema, testerContext)).toBe(NOT_APPLICABLE);
    expect(stageEntry?.tester({ type: 'Flow' }, schema, testerContext)).toBe(NOT_APPLICABLE);
    expect(stageEntry?.tester({ type: 'Condition' }, schema, testerContext)).toBe(NOT_APPLICABLE);
    expect(conditionEntry?.tester({ type: 'Flow' }, schema, testerContext)).toBe(NOT_APPLICABLE);
    expect(conditionEntry?.tester({ type: 'Stage' }, schema, testerContext)).toBe(NOT_APPLICABLE);
  });

  it('is exposed as ./renderers/xyflow through a generated src/renderers-xyflow.ts', () => {
    const exportsMap = pkg.exports as Record<string, Record<string, string>>;
    expect(exportsMap['./renderers/xyflow']).toEqual({
      types: './dist/renderers-xyflow.d.ts',
      development: './src/renderers-xyflow.ts',
      import: './dist/renderers-xyflow.js',
      require: './dist/renderers-xyflow.cjs',
    });
    expect(readFileSync(resolve(root, 'src/renderers-xyflow.ts'), 'utf8')).toBe(
      "export * from './renderers/xyflow/index';\n",
    );
  });

  it('pins @xyflow/react 12.11.3 in dependencies and imports its stylesheet from src/styles.css', () => {
    expect((pkg.dependencies as Record<string, string>)['@xyflow/react']).toBe('12.11.3');
    const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
    expect(css).toContain("@import '@xyflow/react/dist/style.css';");
    expect(existsSync(resolve(root, '../../node_modules/@xyflow/react/dist/style.css'))).toBe(true);
  });
});

describe('Flow renderer (rules 6-11)', () => {
  it('renders data-slot="flow" holding a ReactFlow at the root', () => {
    const { container } = renderFlow(flow([stage('a')]));
    const canvas = container.querySelector('[data-slot="flow"]');
    expect(canvas).not.toBeNull();
    expect(canvas).toHaveClass('h-full', 'min-h-96', 'w-full');
    expect(canvas?.querySelector('.react-flow')).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders one stage node per Stage, in elements order, keyed by stageIdOf', () => {
    const { container } = renderFlow(flow([stage('a'), stage('b'), stage('a'), stage(undefined)]));
    expect(nodeIds(container)).toEqual(['a', 'b', '__stage-2', '__stage-3']);
    expect(container.querySelectorAll('[data-slot="stage-card"]')).toHaveLength(4);
  });

  it('draws only sanitised edges', async () => {
    const uischema = flow(
      [stage('a'), stage('b'), stage('c')],
      [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'ghost' },
        { id: 'e3', source: 'c', target: 'c' },
        { id: 'e4', source: 'a', target: 'b' },
        { id: 'e5', source: 'b', target: 'c' },
      ],
    );
    expect(toFlowEdges(uischema).map(({ id }) => id)).toEqual(['e1', 'e5']);
    expect(toFlowEdges(uischema)[0]?.markerEnd).toEqual({ type: 'arrowclosed' });

    const { container } = renderFlow(uischema);
    await waitFor(() =>
      expect(
        [...container.querySelectorAll('[data-testid^="rf__edge-"]')].map((edge) =>
          edge.getAttribute('data-testid'),
        ),
      ).toEqual(['rf__edge-e1', 'rf__edge-e5']),
    );
  });

  // Doc 199 rule 22: a Flow holds two kinds of node now, so the stray-child message names both.
  it('shows "Only Stages and Conditions can be placed in a Flow." and skips other children', () => {
    const { container } = renderFlow(flow([stage('a'), { type: 'Heading', text: 'Stray' }]));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Only Stages and Conditions can be placed in a Flow.');
    expect(alert).toHaveAttribute('data-slot', 'flow-element-error');
    expect(nodeIds(container)).toEqual(['a']);
    expect(screen.queryByText('Stray')).toBeNull();
  });

  it('renders "A Flow can only be the root element." inside a layout (LayoutNestingContext set)', () => {
    const { container } = renderFlow(
      el({ type: 'VerticalLayout', elements: [flow([stage('a')])] }),
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('A Flow can only be the root element.');
    expect(alert).toHaveAttribute('data-slot', 'flow-nested-error');
    expect(container.querySelector('.react-flow')).toBeNull();
  });

  it('is view-only without an editor: nodes not draggable or connectable, nothing selectable, no delete key', () => {
    const { container } = renderFlow(
      flow([stage('a'), stage('b')], [{ id: 'e1', source: 'a', target: 'b' }]),
    );
    const node = nodeOf(container, 'a');
    expect(node).not.toHaveClass('draggable');
    expect(node).not.toHaveClass('selectable');
    for (const handle of container.querySelectorAll('.react-flow__handle')) {
      expect(handle).not.toHaveClass('connectable');
    }
    fireEvent.click(node);
    fireEvent.keyDown(node, { key: 'Delete' });
    fireEvent.keyDown(node, { key: 'Backspace' });
    expect(node).not.toHaveClass('selected');
    expect(nodeIds(container)).toEqual(['a', 'b']);
  });
});

describe('Stage renderer (rules 13-15)', () => {
  it('renders "A Stage can only be placed in a Flow." without a FlowContext', () => {
    const { container } = renderFlow(stage('a'));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('A Stage can only be placed in a Flow.');
    expect(alert).toHaveAttribute('data-slot', 'stage-placement-error');
    expect(container.querySelector('[data-slot="stage-card"]')).toBeNull();
  });

  it('renders a stage-card with the Stage label (fallback "Stage") inside a Flow', () => {
    const { container } = renderFlow(
      flow([
        stage('a', [form('F')], { label: 'Applicant' }),
        stage('b', [form('G')], { label: '  ' }),
      ]),
    );
    expect(nodeOf(container, 'a').querySelector('[data-slot="stage-label"]')).toHaveTextContent(
      'Applicant',
    );
    expect(nodeOf(container, 'b').querySelector('[data-slot="stage-label"]')).toHaveTextContent(
      /^Stage$/,
    );
  });

  it('lists one stage-form-row per Form child with its label (fallback "Form") and never dispatches the Form', () => {
    const inside = { type: 'Heading', text: 'Inside the form' };
    const { container } = renderFlow(flow([stage('a', [form('Contact', [inside]), form()])]));
    const rows = [...nodeOf(container, 'a').querySelectorAll('[data-slot="stage-form-row"]')];
    expect(rows.map((row) => row.textContent)).toEqual(['Contact', 'Form']);
    expect(rows[0]?.querySelector('svg')).not.toBeNull();
    expect(screen.queryByText('Inside the form')).toBeNull();
  });

  it('shows a non-Form child as a destructive row with "Only Forms can be placed in a Stage."', () => {
    const { container } = renderFlow(
      flow([stage('a', [form('Ok'), { type: 'Grid', elements: [] }])]),
    );
    const card = nodeOf(container, 'a');
    const invalid = card.querySelector('[data-slot="stage-invalid-row"]');
    expect(invalid).toHaveTextContent('Grid');
    expect(invalid).toHaveClass('text-destructive');
    expect(card.querySelector('[role="alert"]')).toHaveTextContent(
      'Only Forms can be placed in a Stage.',
    );
    expect(card.querySelectorAll('[data-slot="stage-form-row"]')).toHaveLength(1);
  });

  it('shows "No forms" for a Stage with no children', () => {
    const { container } = renderFlow(flow([stage('a', [])]));
    const card = nodeOf(container, 'a');
    expect(card.querySelector('[data-slot="stage-empty"]')).toHaveTextContent('No forms');
    expect(card.querySelector('[data-slot="stage-form-row"]')).toBeNull();
    expect(card.querySelector('[role="alert"]')).toBeNull();
  });

  it('renders non-connectable target (left) and source (right) handles (doc 198 rules 3, 32b)', () => {
    const { container } = renderFlow(flow([stage('a')]));
    const node = nodeOf(container, 'a');
    const target = node.querySelector('.react-flow__handle.target');
    const source = node.querySelector('.react-flow__handle.source');
    // Rule 32b: the canvas runs left to right by default, so edges arrive on the left and leave on the right.
    expect(target).toHaveClass('react-flow__handle-left', 'opacity-0');
    expect(source).toHaveClass('react-flow__handle-right', 'opacity-0');
    expect(target).not.toHaveClass('connectable');
    expect(source).not.toHaveClass('connectable');
  });

  it('renders no + affordance without an editor (doc 198 rule 14)', () => {
    const { container } = renderFlow(
      flow([stage('a'), stage('b')], [{ id: 'e1', source: 'a', target: 'b' }]),
    );
    expect(container.querySelector('[data-slot="flow-leaf-add"]')).toBeNull();
    expect(container.querySelector('[data-slot="flow-edge-add"]')).toBeNull();
    expect(container.querySelector('[data-slot="stage-add-form"]')).toBeNull();
  });

  it('wraps the dispatched Stage, and not its handles, in a pointer-events-auto element (rule 15b)', () => {
    const { container } = renderFlow(flow([stage('a')]));
    const node = nodeOf(container, 'a');
    // xyflow makes a view-only node pointer-events: none, which its children inherit; jsdom does not hit-test, so the
    // wrapper that restores presses on the card is pinned here.
    expect(node.style.pointerEvents).toBe('none');
    const wrapper = node.querySelector(':scope > [data-slot="stage-node"]');
    expect(wrapper).toHaveClass('pointer-events-auto');
    expect(wrapper?.querySelector('[data-slot="stage-card"]')).not.toBeNull();
    expect(wrapper?.querySelector('.react-flow__handle')).toBeNull();
  });
});
