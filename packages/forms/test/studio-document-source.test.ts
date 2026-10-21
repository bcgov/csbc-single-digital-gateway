import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { documentFor, FORM_CHOICES } from '../src/studio/document/document-source';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';
import { flowProblems } from '../src/renderers/xyflow/flow-graph';
import type {
  ConditionElement,
  FlowElement,
  FormElement,
  StageElement,
} from '../src/types/elements';

// Doc 200 rules 8-9, 12-14 — `documentFor(choice)`: the four documents the New form dialog offers,
// built pure and fresh per call.

interface TreeNode {
  type: string;
  elements?: TreeNode[];
}

/** Every element in the document, root included. */
function walk(element: UISchemaElement): TreeNode[] {
  const node = element as TreeNode;
  return [node, ...(node.elements ?? []).flatMap((child) => walk(child as UISchemaElement))];
}

const flowOf = (choice: 'template-multi-stage' | 'new-multi-stage'): FlowElement =>
  documentFor(choice).uischema as FlowElement;

const stagesOf = (flow: FlowElement): StageElement[] =>
  flow.elements.filter((element): element is StageElement => element.type === 'Stage');

const conditionsOf = (flow: FlowElement): ConditionElement[] =>
  flow.elements.filter((element): element is ConditionElement => element.type === 'Condition');

const edgesOf = (flow: FlowElement) => flow.options?.edges ?? [];

describe('documentFor', () => {
  describe('new-multi-stage', () => {
    it('returns a Flow root holding one Stage with one Form, and no edges', () => {
      const flow = flowOf('new-multi-stage');
      expect(flow.type).toBe('Flow');
      expect(flow.options?.edges).toEqual([]);

      const stages = stagesOf(flow);
      expect(stages).toHaveLength(1);
      const [stage] = stages as [StageElement];
      expect(stage.label).toBe('Stage 1');
      // The Stage is named as the start, so a brand new flow is never startless (doc 203 rule 19).
      expect(flow.options?.startId).toBe(stage.id);

      expect(stage.elements).toHaveLength(1);
      const [form] = stage.elements as [FormElement];
      expect(form.type).toBe('Form');
      // Untitled, like the Form the canvas `+` creates — it reads as "Untitled form" until named.
      expect(form.label).toBeUndefined();
      // Empty: the author fills it, and an empty Form is what "New" means.
      expect(form.elements).toEqual([]);
    });

    it('gives the Stage and its Form authored ids, so both are addressable', () => {
      const [stage] = stagesOf(flowOf('new-multi-stage')) as [StageElement];
      const [form] = stage.elements as [FormElement];
      expect(typeof stage.id).toBe('string');
      expect(typeof form.id).toBe('string');
      expect(form.id).not.toBe(stage.id);
    });

    it('hands back a document of its own each time, sharing nothing with the last', () => {
      const first = flowOf('new-multi-stage');
      const second = flowOf('new-multi-stage');
      expect(second).toEqual(first);
      expect(second).not.toBe(first);
      expect(second.elements[0]).not.toBe(first.elements[0]);
    });

    it('carries the empty object schema', () => {
      expect(documentFor('new-multi-stage').schema).toEqual({ type: 'object', properties: {} });
    });
  });

  describe('new-basic', () => {
    it('returns a Form root with no elements', () => {
      const { uischema } = documentFor('new-basic');
      expect(uischema.type).toBe('Form');
      expect((uischema as TreeNode).elements).toEqual([]);
    });

    it('carries the empty object schema', () => {
      expect(documentFor('new-basic').schema).toEqual({ type: 'object', properties: {} });
    });
  });

  describe('template-basic', () => {
    it('returns the built-in sample document unchanged', () => {
      const { schema, uischema } = documentFor('template-basic');
      expect(uischema).toEqual(STUDIO_SAMPLE_UISCHEMA);
      expect(schema).toEqual(STUDIO_SAMPLE_SCHEMA);
    });
  });

  describe('template-multi-stage', () => {
    it('returns a Flow root whose nodes branch and merge', () => {
      const flow = flowOf('template-multi-stage');
      const stages = stagesOf(flow);
      const edges = edgesOf(flow);
      expect(flow.type).toBe('Flow');
      // Rule 12: the template exists to make the layout legible, so it must not be a straight line.
      expect(stages.length).toBeGreaterThanOrEqual(4);
      expect(edges.length).toBeGreaterThan(stages.length);

      // A fork: some node is the source of more than one edge. A merge: some node is the target of more than one.
      const outDegree = new Map<string, number>();
      const inDegree = new Map<string, number>();
      for (const edge of edges) {
        outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1);
        inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
      }
      expect([...outDegree.values()].filter((count) => count > 1).length).toBeGreaterThan(0);
      expect([...inDegree.values()].filter((count) => count > 1).length).toBeGreaterThan(0);
    });

    it('passes the studio flow gate with no problems', () => {
      // The same gate the code editor applies, so the template is exactly as valid as a UI-authored document.
      expect(flowProblems(flowOf('template-multi-stage'))).toEqual([]);
    });

    it('gives every Stage the required top-level id', () => {
      // Doc 219: the id is a TOP-LEVEL sibling now; still required, still what edges address.
      const ids = stagesOf(flowOf('template-multi-stage')).map((stage) => stage.id);
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('gives every Form a top-level id so doc 197 can deep link it', () => {
      const forms = walk(flowOf('template-multi-stage')).filter((node) => node.type === 'Form');
      const ids = forms.map((form) => (form as { id?: string }).id);
      expect(forms.length).toBeGreaterThan(0);
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('holds exactly one Form per Stage', () => {
      for (const stage of stagesOf(flowOf('template-multi-stage'))) {
        expect(stage.elements.filter((element) => element.type === 'Form')).toHaveLength(1);
      }
    });

    it('branches through Condition nodes whose rows are complete', () => {
      // Rule 12, restated over rows (doc 199 rules 35, 52): every row is authored complete, exactly as the UI
      // would author one (doc 199 rules 26, 46) — a label, a `match`, and at least one complete clause.
      const flow = flowOf('template-multi-stage');
      const conditions = conditionsOf(flow);
      expect(conditions.length).toBeGreaterThanOrEqual(2);

      const fieldKeys = Object.keys(documentFor('template-multi-stage').schema.properties ?? {});
      for (const condition of conditions) {
        expect(condition.options.rows.length).toBeGreaterThan(0);
        for (const row of condition.options.rows) {
          expect(row.label).not.toBe('');
          expect(['all', 'any']).toContain(row.match);
          expect(row.clauses.length).toBeGreaterThan(0);
          for (const clause of row.clauses) {
            expect(fieldKeys).toContain(clause.field);
            // `isTrue`/`isFalse` take no value, and an absent value must be an ABSENT KEY.
            const valueless = clause.operator === 'isTrue' || clause.operator === 'isFalse';
            expect('value' in clause).toBe(!valueless);
          }
        }
      }
    });

    it('gives every Condition a default path and one edge per row', () => {
      // Doc 199 rule 10: a Condition with no default path (an edge carrying no sourceHandle) is a flow problem.
      const flow = flowOf('template-multi-stage');
      for (const condition of conditionsOf(flow)) {
        const outgoing = edgesOf(flow).filter((edge) => edge.source === condition.id);
        const handles = outgoing.flatMap((edge) =>
          edge.sourceHandle === undefined ? [] : [edge.sourceHandle],
        );
        expect(outgoing.filter((edge) => edge.sourceHandle === undefined)).toHaveLength(1);
        // Doc 199 rule 37: a ROW's id is the sourceHandle of the edge leaving that branch.
        expect(handles.toSorted()).toEqual(condition.options.rows.map((row) => row.id).toSorted());
      }
    });

    it('names every edge source and target as an existing node id', () => {
      const flow = flowOf('template-multi-stage');
      const ids = new Set([
        ...stagesOf(flow).map((stage) => stage.id),
        ...conditionsOf(flow).map((condition) => condition.id),
      ]);
      for (const edge of edgesOf(flow)) {
        expect(ids.has(edge.source)).toBe(true);
        expect(ids.has(edge.target)).toBe(true);
      }
    });
  });

  describe('freshness (rule 9)', () => {
    it('returns a document that is not referentially equal to the previous call', () => {
      // A shared constant would defeat the referential reset at use-studio-document.ts:76.
      for (const choice of FORM_CHOICES) {
        const first = documentFor(choice);
        const second = documentFor(choice);
        expect(first.uischema, choice).not.toBe(second.uischema);
        expect(first.schema, choice).not.toBe(second.schema);
      }
    });

    it('returns deeply equal documents across calls for the same choice', () => {
      for (const choice of FORM_CHOICES) {
        expect(documentFor(choice), choice).toEqual(documentFor(choice));
      }
    });

    it('does not leak a mutation of one result into the next call', () => {
      const first = documentFor('template-multi-stage');
      const flow = first.uischema as FlowElement;
      flow.elements.length = 0;
      flow.label = 'mutated';
      expect(
        (documentFor('template-multi-stage').uischema as FlowElement).elements.length,
      ).toBeGreaterThan(0);
      expect((documentFor('template-multi-stage').uischema as FlowElement).label).not.toBe(
        'mutated',
      );
    });

    it('returns a fresh schema object too, not only a fresh uischema', () => {
      const { schema } = documentFor('template-basic');
      (schema as { properties?: Record<string, unknown> }).properties = {};
      expect(documentFor('template-basic').schema).toEqual(STUDIO_SAMPLE_SCHEMA);
      // The module constant itself must survive a caller mutating what it was handed.
      expect(Object.keys(STUDIO_SAMPLE_SCHEMA.properties ?? {}).length).toBeGreaterThan(0);
    });
  });

  describe('every choice', () => {
    it('produces a root the studio accepts — Form or Flow', () => {
      // studio-canvas.tsx ROOT_TYPES; no choice may produce a document the canvas rejects.
      for (const choice of FORM_CHOICES) {
        expect(['Form', 'Flow'], choice).toContain(documentFor(choice).uischema.type);
      }
    });
  });
});
