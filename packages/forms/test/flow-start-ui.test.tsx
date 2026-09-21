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
const BADGE_SLOT = '[data-slot="flow-stage-badge"]';
const WRAPPER = '[data-slot="stage-node"]';

const stageData = (uischema: UISchemaElement, id: string) => {
  const node = toFlowNodes(uischema).find((candidate) => candidate.id === id);
  return (node as StageFlowNode | undefined)?.data;
};

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
      // A Condition is never STARTED at and holds no Forms to lead anywhere, so it takes neither isStart nor
      // isLeaf — but it can be stranded, so it carries isUnreachable (rule 9, widened 2026-09-17).
      const conditionNode = toFlowNodes(uischema).find((node) => node.id === 'x');
      expect(Object.keys(conditionNode?.data ?? {}).toSorted()).toEqual([
        'connectedOutputs',
        'element',
        'isUnreachable',
      ]);
    });
  });

  describe('the start and end treatments (rule 8, amended)', () => {
    it('rings the start Stage blue, with no marker chrome hung off it', () => {
      // Rule 8b: 'a' needs an outgoing edge to be a PURE start — without one it is also a leaf, and a
      // Stage that is both now wears the split ring instead.
      const { container } = renderFlow(
        flow([stage('a'), stage('b')], { startId: 'a', edges: [edge('e1', 'a', 'b')] }),
      );
      const wrapper = nodeOf(container, 'a').querySelector(WRAPPER);
      expect(wrapper).toHaveAttribute('data-start');
      expect(wrapper).toHaveClass('ring-4', 'ring-ring');
      // The "Start" badge and its connector line are gone: the card itself says it now.
      expect(container.querySelector(MARKER)).toBeNull();
    });

    it('rings on no other Stage', () => {
      const { container } = renderFlow(
        flow([stage('a'), stage('b')], { startId: 'a', edges: [edge('e1', 'a', 'b')] }),
      );
      expect(nodeOf(container, 'b').querySelector(WRAPPER)).not.toHaveAttribute('data-start');
      expect(container.querySelectorAll(`${WRAPPER}[data-start]`)).toHaveLength(1);
    });

    it('takes the input slot off the start Stage, but still RENDERS the handle', () => {
      const { container } = renderFlow(flow([stage('a'), stage('b')], { startId: 'a' }));
      const target = nodeOf(container, 'a').querySelector('.react-flow__handle.target');
      // Deleting it outright would make an authored edge INTO the start vanish silently (doc 199 rule 18's
      // trap), so it stays in the DOM: hidden, and never connectable.
      expect(target).not.toBeNull();
      expect(target).toHaveClass('opacity-0');
      expect(target?.classList.contains('connectable')).toBe(false);
    });

    it('rings an end Stage BLACK — one no edge leaves', () => {
      const { container } = renderFlow(
        flow([stage('a'), stage('b')], { startId: 'a', edges: [edge('e1', 'a', 'b')] }),
      );
      const end = nodeOf(container, 'b').querySelector(WRAPPER);
      expect(end).toHaveAttribute('data-end');
      // Black, not red: an end is a perfectly good state, and red is reserved for a node that can never route
      // an answer anywhere. A finished flow's last Stage would otherwise wear a warning forever.
      expect(end).toHaveClass('ring-4', 'ring-gray-80');
      expect(end).not.toHaveClass('ring-danger-border');
      // The Stage the flow leaves is not an end, so it keeps no ring of its own.
      expect(nodeOf(container, 'a').querySelector(WRAPPER)).not.toHaveAttribute('data-end');
    });

    it('says BOTH when one Stage is start and end, with a split ring (rule 8b)', () => {
      // SUPERSEDES "start wins" (2026-09-21). A one-Stage flow begins and ends on the same card, and
      // saying only "Start" hid the half the author needed: that nothing follows it.
      const { container } = renderFlow(flow([stage('a')], { startId: 'a' }));
      const wrapper = nodeOf(container, 'a').querySelector(WRAPPER);
      expect(wrapper).toHaveAttribute('data-start');
      expect(wrapper).toHaveAttribute('data-end');
      // The split is its own STATE, not a class the test reads — see rule 8b.
      expect(wrapper).toHaveAttribute('data-split');
    });

    it('wears a SINGLE ring when it is only one of the two (rule 8b)', () => {
      const { container } = renderFlow(
        flow([stage('a'), stage('b')], { startId: 'a', edges: [edge('e1', 'a', 'b')] }),
      );
      for (const id of ['a', 'b'])
        expect(nodeOf(container, id).querySelector(WRAPPER)).not.toHaveAttribute('data-split');
      expect(nodeOf(container, 'a').querySelector(WRAPPER)).toHaveClass('ring-ring');
      expect(nodeOf(container, 'b').querySelector(WRAPPER)).toHaveClass('ring-gray-80');
    });

    it('carries NO glow on the split ring (rule 8b)', () => {
      // Every single tone pairs its ring with a `*-surface` glow; a box-shadow cannot be a gradient, and
      // borrowing one family's would say the node is more that thing than the other.
      const { container } = renderFlow(flow([stage('a')], { startId: 'a' }));
      const wrapper = nodeOf(container, 'a').querySelector(WRAPPER);
      expect(wrapper?.className).not.toContain('shadow-[0_0_0_6px');
      expect(wrapper).not.toHaveClass('ring-4');
    });

    it('lets UNREACHABLE suppress both, since a stranded node says that first (rule 8b)', () => {
      // A start is never unreachable, so the only way to reach this is an end that nothing routes to.
      const { container } = renderFlow(flow([stage('a'), stage('b')], { startId: 'a' }));
      const stranded = nodeOf(container, 'b').querySelector(WRAPPER);
      expect(stranded).toHaveAttribute('data-unreachable');
      expect(stranded).not.toHaveAttribute('data-split');
      expect(stranded).toHaveClass('ring-danger-border');
    });

    it('captions the start and the end above the card, so the ring is not colour alone', () => {
      const { container } = renderFlow(
        flow([stage('a'), stage('b')], { startId: 'a', edges: [edge('e1', 'a', 'b')] }),
      );
      expect(nodeOf(container, 'a').querySelector(BADGE_SLOT)).toHaveTextContent('Start');
      expect(nodeOf(container, 'b').querySelector(BADGE_SLOT)).toHaveTextContent('End');
    });

    it('puts Start on the left of the strip and End on the right (rule 8b)', () => {
      const { container } = renderFlow(
        flow([stage('a'), stage('b')], { startId: 'a', edges: [edge('e1', 'a', 'b')] }),
      );
      expect(nodeOf(container, 'a').querySelector(BADGE_SLOT)).toHaveAttribute('data-side', 'left');
      expect(nodeOf(container, 'b').querySelector(BADGE_SLOT)).toHaveAttribute(
        'data-side',
        'right',
      );
    });

    it('shows BOTH captions on a one-Stage flow, one at each end of the strip (rule 8b)', () => {
      const { container } = renderFlow(flow([stage('a')], { startId: 'a' }));
      const badges = [...nodeOf(container, 'a').querySelectorAll(BADGE_SLOT)];
      expect(badges.map((badge) => badge.textContent)).toEqual(['Start', 'End']);
      expect(badges.map((badge) => badge.getAttribute('data-side'))).toEqual(['left', 'right']);
    });

    it('captions a middle Stage with nothing at all', () => {
      const { container } = renderFlow(
        flow([stage('a'), stage('b'), stage('c')], {
          startId: 'a',
          edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
        }),
      );
      expect(nodeOf(container, 'b').querySelector(BADGE_SLOT)).toBeNull();
    });

    it('captions a Stage that is both "Start", matching its ring', () => {
      const { container } = renderFlow(flow([stage('a')], { startId: 'a' }));
      expect(nodeOf(container, 'a').querySelector(BADGE_SLOT)).toHaveTextContent('Start');
    });

    it('keeps the caption presentational: no handle, and out of the pane gestures', () => {
      const { container } = renderFlow(flow([stage('a')], { startId: 'a' }));
      const badge = nodeOf(container, 'a').querySelector(BADGE_SLOT);
      expect(badge).toHaveClass('nodrag', 'nopan', 'pointer-events-none');
      expect(badge?.querySelector('.react-flow__handle')).toBeNull();
    });

    it('fills the caption with the state colour and sets white text on it', () => {
      const { container } = renderFlow(
        flow([stage('a'), stage('b')], { startId: 'a', edges: [edge('e1', 'a', 'b')] }),
      );
      // Solid, not outlined: `*-border` is the family's only mid-tone, and white on either lands at about
      // 4.7:1, which clears AA for text this size.
      expect(nodeOf(container, 'a').querySelector(BADGE_SLOT)).toHaveClass(
        'bg-ring',
        'text-white',
        'font-semibold',
      );
      expect(nodeOf(container, 'b').querySelector(BADGE_SLOT)).toHaveClass(
        'bg-gray-80',
        'text-white',
      );
    });

    it('rings view-only too, with no editor present', () => {
      // No FlowEditorProvider here, so the leaf + is absent (doc 198 rule 14) — but where the flow begins and
      // ends is structure, not authoring, so it is drawn either way.
      const { container } = renderFlow(flow([stage('a')], { startId: 'a' }));
      expect(container.querySelector('[data-slot="flow-leaf-add"]')).toBeNull();
      expect(nodeOf(container, 'a').querySelector(WRAPPER)).toHaveAttribute('data-start');
      expect(nodeOf(container, 'a').querySelector(BADGE_SLOT)).toHaveTextContent('Start');
    });
  });

  describe('the unreachable treatment (rules 9-10)', () => {
    const unreachable = flow([stage('a'), stage('b'), stage('c')], {
      edges: [edge('e1', 'a', 'b')],
    });

    it('rings an unreachable Stage RED, captioned "Not reachable"', () => {
      const { container } = renderFlow(unreachable);
      const node = nodeOf(container, 'c');
      expect(node.querySelector(WRAPPER)).toHaveAttribute('data-unreachable');
      // Red (user 2026-09-17): being stranded is a fault in the document, which is what red now means.
      expect(node.querySelector(WRAPPER)).toHaveClass('ring-4', 'ring-danger-border');
      const badge = node.querySelector(BADGE_SLOT);
      expect(badge).toHaveTextContent('Not reachable');
      expect(badge).toHaveClass('bg-danger-border', 'nodrag', 'nopan', 'pointer-events-none');
    });

    it('outranks the end ring: a stranded Stage says it is stranded, not that the flow stops there', () => {
      // 'c' is a leaf as well as unreachable. Being stranded is the more urgent of the two to be told.
      const { container } = renderFlow(unreachable);
      const wrapper = nodeOf(container, 'c').querySelector(WRAPPER);
      expect(wrapper).toHaveAttribute('data-end');
      expect(wrapper).toHaveClass('ring-danger-border');
      expect(wrapper).not.toHaveClass('ring-gray-80');
      expect(nodeOf(container, 'c').querySelector(BADGE_SLOT)).toHaveTextContent('Not reachable');
    });

    it('leaves a reachable, non-terminal Stage unmarked', () => {
      const { container } = renderFlow(unreachable);
      // 'a' is the start and 'b' an end, so neither is bare — reach for a middle Stage instead.
      const middle = flow([stage('a'), stage('b'), stage('c')], {
        edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
      });
      const { container: chain } = renderFlow(middle);
      const node = nodeOf(chain, 'b');
      expect(node.querySelector(WRAPPER)).not.toHaveAttribute('data-unreachable');
      expect(node.querySelector(BADGE_SLOT)).toBeNull();
      expect(container).toBeDefined();
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
      // Doc 202 rule 47 adds the review toggle beside it — both are Flow-level settings.
      expect(sections(built)[0]).toEqual(['General', ['label', 'startId', 'review']]);
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

    it('is not offered at all by a Flow with no Stage to pick (an empty oneOf is an invalid schema)', () => {
      // JSONForms' Ajv compiles the whole inspector schema before any renderer runs, so an empty `oneOf` threw
      // "schema is invalid: data/properties/startId/oneOf must NOT have fewer than 1 items" over the General
      // section entirely — what a brand new multi-stage form showed.
      for (const empty of [flow([]), flow([condition('x')]), flow([el({ type: 'Stage' })])]) {
        const { form: built } = formFor(empty, empty, schema);
        const keys = sections(built).flatMap(([, fields]) => fields);
        expect(keys).not.toContain('startId');
        expect(keys).toContain('label');
      }
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
