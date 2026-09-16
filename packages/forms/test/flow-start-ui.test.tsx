import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as ui from '../src/renderers-ui';
import * as xyflow from '../src/renderers-xyflow';
import { toFlowNodes, type StageFlowNode } from '../src/renderers/xyflow/flow-nodes';
import { validateUischemaDocument } from '../src/studio/code/validate-document';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { createElementIds } from '../src/studio/layout/element-ids';
import { fieldSchema, formFor, sections } from './inspector-fixtures';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 203 — the canvas Start marker, the unreachable treatment and the Flow inspector's Start stage picker.
// The pure resolver and reachability are in flow-start.test.ts.

useXyflowJsdom();

const schema: JsonSchema = { type: 'object', properties: {} };

const el = (element: object) => element as UISchemaElement;
const form = (label: string) => el({ type: 'Form', label, elements: [] });
const stage = (id: string, label?: string) =>
  el({
    type: 'Stage',
    elements: [form('Details')],
    options: { id },
    ...(label === undefined ? {} : { label }),
  });
const condition = (id: string) => el({ type: 'Condition', options: { id, criteria: [] } });
const flow = (elements: object[], options?: object) =>
  el({ type: 'Flow', elements, ...(options === undefined ? {} : { options }) });
const edge = (id: string, source: string, target: string) => ({ id, source, target });

const RENDERERS = [...ui.displayRenderers, ...xyflow.layoutRenderers];

const renderFlow = (uischema: UISchemaElement) =>
  render(
    <div style={{ width: '800px', height: '600px' }}>
      <JsonForms schema={schema} uischema={uischema} data={{}} renderers={RENDERERS} cells={[]} />
    </div>,
  );

const nodeOf = (container: HTMLElement, id: string) => {
  const node = container.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`);
  if (!node) throw new Error(`missing node ${id}`);
  return node;
};

const MARKER = '[data-slot="flow-start-marker"]';
const BADGE = '[data-slot="flow-unreachable-badge"]';
const WRAPPER = '[data-slot="stage-node"]';

const stageData = (uischema: UISchemaElement, id: string) => {
  const node = toFlowNodes(uischema).find((candidate) => candidate.id === id);
  return (node as StageFlowNode | undefined)?.data;
};

const DOCUMENT_POSITION_FOLLOWING = 4;
const precedes = (first: Element, second: Element) =>
  (first.compareDocumentPosition(second) & DOCUMENT_POSITION_FOLLOWING) !== 0;

describe('Flow start stage — canvas and inspector (doc 203)', () => {
  describe('node data (rule 7)', () => {
    it('marks the start Stage isStart in toFlowNodes', () => {
      const uischema = flow([stage('a'), stage('b')], { startId: 'b' });
      expect(stageData(uischema, 'b')?.isStart).toBe(true);
      expect(stageData(uischema, 'a')?.isStart).toBe(false);
      // And with no authored start, the fallback Stage wears it.
      const derived = flow([stage('a'), stage('b')]);
      expect(stageData(derived, 'a')?.isStart).toBe(true);
    });

    it('marks every unreachable Stage isUnreachable', () => {
      const uischema = flow([stage('a'), stage('b'), stage('c')], {
        edges: [edge('e1', 'a', 'b')],
      });
      expect(stageData(uischema, 'a')?.isUnreachable).toBe(false);
      expect(stageData(uischema, 'b')?.isUnreachable).toBe(false);
      expect(stageData(uischema, 'c')?.isUnreachable).toBe(true);
    });

    it('derives both from the Flow, as isLeaf already is — a card cannot see the edges', () => {
      const uischema = flow([stage('a'), condition('x')], { edges: [edge('e1', 'a', 'x')] });
      // Every whole-Flow answer arrives on the Stage's node data, beside isLeaf.
      expect(Object.keys(stageData(uischema, 'a') ?? {}).toSorted()).toEqual([
        'element',
        'isLeaf',
        'isStart',
        'isUnreachable',
      ]);
      // A Condition's data is untouched: it is traversed, never started at or visited.
      const conditionNode = toFlowNodes(uischema).find((node) => node.id === 'x');
      expect(Object.keys(conditionNode?.data ?? {}).toSorted()).toEqual([
        'connectedOutputs',
        'element',
      ]);
    });
  });

  describe('the Start marker (rule 8)', () => {
    it('renders above the top handle on the start Stage', () => {
      const { container } = renderFlow(flow([stage('a'), stage('b')], { startId: 'a' }));
      const node = nodeOf(container, 'a');
      const marker = node.querySelector(MARKER);
      expect(marker).toHaveTextContent('Start');
      const target = node.querySelector('.react-flow__handle.target');
      expect(precedes(marker as Element, target as Element)).toBe(true);
    });

    it('renders on no other Stage', () => {
      const { container } = renderFlow(flow([stage('a'), stage('b')], { startId: 'a' }));
      expect(nodeOf(container, 'b').querySelector(MARKER)).toBeNull();
      expect(container.querySelectorAll(MARKER)).toHaveLength(1);
    });

    it('is presentational: not a handle, not connectable, and carries nodrag nopan', () => {
      const { container } = renderFlow(flow([stage('a')], { startId: 'a' }));
      const marker = nodeOf(container, 'a').querySelector(MARKER);
      expect(marker).toHaveClass('nodrag', 'nopan', 'pointer-events-none');
      expect(marker?.querySelector('.react-flow__handle')).toBeNull();
      expect(marker?.classList.contains('connectable')).toBe(false);
    });

    it('renders view-only too, with no editor present', () => {
      // No FlowEditorProvider here, so the leaf + is absent (doc 198 rule 14) — but the start still says so.
      const { container } = renderFlow(flow([stage('a')], { startId: 'a' }));
      expect(container.querySelector('[data-slot="flow-leaf-add"]')).toBeNull();
      expect(container.querySelector(MARKER)).not.toBeNull();
    });
  });

  describe('the unreachable treatment (rules 9-10)', () => {
    const unreachable = flow([stage('a'), stage('b'), stage('c')], {
      edges: [edge('e1', 'a', 'b')],
    });

    it('marks an unreachable Stage visibly, with a "Not reachable" badge', () => {
      const { container } = renderFlow(unreachable);
      const node = nodeOf(container, 'c');
      expect(node.querySelector(WRAPPER)).toHaveAttribute('data-unreachable');
      expect(node.querySelector(WRAPPER)).toHaveClass('opacity-60', 'outline-dashed');
      expect(node.querySelector(BADGE)).toHaveTextContent('Not reachable');
      // Presentational, like the marker.
      expect(node.querySelector(BADGE)).toHaveClass('nodrag', 'nopan', 'pointer-events-none');
    });

    it('leaves a reachable Stage unmarked', () => {
      const { container } = renderFlow(unreachable);
      for (const id of ['a', 'b']) {
        const node = nodeOf(container, id);
        expect(node.querySelector(WRAPPER), id).not.toHaveAttribute('data-unreachable');
        expect(node.querySelector(BADGE), id).toBeNull();
      }
    });

    it('does not stop the document applying in the code editor', () => {
      // Rule 10: mid-wiring every new Stage is unreachable, so refusing the document would fight the author.
      expect(validateUischemaDocument(unreachable).valid).toBe(true);
    });
  });

  describe('the Start stage picker (rules 14-18)', () => {
    const applicant = stage('a', 'Applicant');
    const review = stage('b', 'Review');
    // The SAME instance must be in the tree and in the assertion: formFor resolves an element by identity.
    const branch = condition('x');
    const root = flow([applicant, review, branch], { startId: 'b' });

    it('shows a Start stage field in General for a selected Flow, after Label', () => {
      const { form: built } = formFor(root, root, schema);
      expect(sections(built)[0]).toEqual(['General', ['label', 'startId']]);
    });

    it('shows no Start stage field for a Stage or a Condition', () => {
      for (const element of [applicant, branch]) {
        const { form: built } = formFor(element, root, schema);
        const keys = sections(built).flatMap(([, fields]) => fields);
        expect(keys, element.type).not.toContain('startId');
      }
    });

    it('offers each drawn Stage, by its name', () => {
      const { form: built } = formFor(root, root, schema);
      expect(fieldSchema(built, 'startId')).toEqual({
        type: 'string',
        oneOf: [
          { const: 'a', title: 'Applicant' },
          { const: 'b', title: 'Review' },
        ],
      });
    });

    it('offers no Condition', () => {
      const { form: built } = formFor(root, root, schema);
      const oneOf = (fieldSchema(built, 'startId')?.oneOf ?? []) as { const: string }[];
      expect(oneOf.map(({ const: value }) => value)).not.toContain('x');
    });

    it('reads the authored startId when it names a drawn Stage', () => {
      const { form: built } = formFor(root, root, schema);
      expect(built.data['startId']).toBe('b');
    });

    it('reads undefined for a dangling startId, which fieldAccepts could never write back', () => {
      const dangling = flow([applicant, review], { startId: 'ghost' });
      const { form: built } = formFor(dangling, dangling, schema);
      expect(built.data['startId']).toBeUndefined();
    });

    it('writes options.startId when a Stage is chosen', () => {
      const ids = createElementIds();
      const next = applyInspector(
        { schema, uischema: root },
        ids.idOf(root),
        { startId: 'a' },
        ids,
      );
      expect(next.uischema.options?.['startId']).toBe('a');
    });

    it('removes the key when cleared, returning the Flow to the fallback', () => {
      const ids = createElementIds();
      const next = applyInspector(
        { schema, uischema: root },
        ids.idOf(root),
        { startId: undefined },
        ids,
      );
      expect(Object.hasOwn(next.uischema.options ?? {}, 'startId')).toBe(false);
    });
  });
});
