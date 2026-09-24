import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { projectPath, upcomingStepRange } from '../src/runner/runner-projection';
import { ghostCaption } from '../src/runner/runner-ghost-step';
import { FLOW_TEMPLATE_SCHEMA, FLOW_TEMPLATE_UISCHEMA } from '../src/studio/document/flow-sample';

// Doc 202 rules 10c-10f — the projected path, where it stops, and the ghost step's range beyond it. Pure.

// Both fields REQUIRED: a blank required field is what leaves a Condition undecided (rule 10f), so these fixtures
// exercise the stop. The optional case is its own describe below.
const schema: JsonSchema = {
  type: 'object',
  properties: { kind: { type: 'string' }, size: { type: 'string' } },
  required: ['kind', 'size'],
};
const el = (element: object) => element as UISchemaElement;
const stage = (id: string, forms = 1) =>
  el({
    type: 'Stage',
    label: id,
    id,
    elements: Array.from({ length: forms }, (_, index) => ({
      type: 'Form',
      id: `${id}-f${index}`,
      elements: [],
    })),
  });
/** A Condition branching on `field === value` through row `c-<id>`, plus its default output. */
const condition = (id: string, field: string, value = 'yes') =>
  el({
    type: 'Condition',
    id,
    options: {
      rows: [
        {
          id: `c-${id}`,
          label: `${field} is ${value}`,
          match: 'all',
          clauses: [{ id: `cl-${id}`, field, operator: 'equals', value }],
        },
      ],
    },
  });
const edge = (source: string, target: string, sourceHandle?: string) => ({
  id: `${source}-${target}`,
  source,
  target,
  ...(sourceHandle === undefined ? {} : { sourceHandle }),
});
const flow = (elements: UISchemaElement[], edges: object[]) =>
  el({ type: 'Flow', elements, options: { edges } });

const run = (
  uischema: UISchemaElement,
  data: object = {},
  documentSchema: JsonSchema = schema,
) => ({
  flow: uischema,
  schema: documentSchema,
  data: data as Record<string, unknown>,
});

/** s1 → x → (yes) a1 → a2 → a3 | (default) b1 */
const UNEVEN = flow(
  [stage('s1'), condition('x', 'kind'), stage('a1'), stage('a2'), stage('a3'), stage('b1')],
  [edge('s1', 'x'), edge('x', 'a1', 'c-x'), edge('a1', 'a2'), edge('a2', 'a3'), edge('x', 'b1')],
);

describe('projectPath (rule 10c)', () => {
  it('reports the undecided Condition it stopped at', () => {
    expect(projectPath(run(UNEVEN))).toEqual({ stageIds: ['s1'], stoppedAt: 'x' });
  });

  it('reports no stop when the answers decide every Condition', () => {
    expect(projectPath(run(UNEVEN, { kind: 'yes' }))).toEqual({
      stageIds: ['s1', 'a1', 'a2', 'a3'],
      stoppedAt: undefined,
    });
  });
});

/** The template's "Applying as" field key. */
const APPLYING_AS = 'iO4pA9sD';

/**
 * The template's projection for stages visited BY NAME, and the ghost range. `required` makes template fields
 * required on top of the shipped schema, which requires none.
 */
const template = (visited: string[], data: object = {}, required: string[] = []) => {
  const context = {
    flow: FLOW_TEMPLATE_UISCHEMA as unknown as UISchemaElement,
    schema: { ...FLOW_TEMPLATE_SCHEMA, required },
    data: data as Record<string, unknown>,
  };
  const labels = new Map(
    // Doc 219: the authored id is a top-level sibling, not an option.
    (FLOW_TEMPLATE_UISCHEMA.elements as { label?: string; id?: string }[]).map((element) => [
      element.id,
      element.label,
    ]),
  );
  const ids = visited.map((label) => [...labels].find(([, name]) => name === label)?.[0] ?? label);
  const set = new Set(ids);
  return {
    listed: projectPath(context, set).stageIds.map((id) => labels.get(id)),
    range: upcomingStepRange(context, set),
  };
};

describe('a route already taken settles its Condition (rule 10e)', () => {
  it('follows the default path once the stage it lands on is visited, though nothing was answered', () => {
    // Next pressed with `kind` empty: the runner went default, to b1.
    const visited = new Set(['s1', 'b1']);
    expect(projectPath(run(UNEVEN), visited)).toEqual({
      stageIds: ['s1', 'b1'],
      stoppedAt: undefined,
    });
    expect(upcomingStepRange(run(UNEVEN), visited)).toBeUndefined();
  });

  it('still stops when only an unrelated stage was visited', () => {
    expect(projectPath(run(UNEVEN), new Set(['s1', 'a1'])).stoppedAt).toBe('x');
  });

  describe('the Multi-Stage Template with "Applying as" REQUIRED', () => {
    it('on Applicant, stops at the unanswered choice and hints 3 more stages', () => {
      // Both branches are 3 stages once the Inspection Condition takes its optional default.
      expect(template(['Applicant'], {}, [APPLYING_AS])).toEqual({
        listed: ['Applicant'],
        range: { min: 3, max: 3 },
      });
    });

    it('on Individual (reached by default), follows the route taken to the end', () => {
      expect(template(['Applicant', 'Individual'], {}, [APPLYING_AS])).toEqual({
        listed: ['Applicant', 'Individual', 'Supporting information', 'Review'],
        range: undefined,
      });
    });
  });
});

describe('a blank OPTIONAL field takes the default path (rule 10f)', () => {
  const optional: JsonSchema = { ...schema, required: [] };

  it('lists the default branch before anything is answered, with no ghost', () => {
    expect(projectPath(run(UNEVEN, {}, optional))).toEqual({
      stageIds: ['s1', 'b1'],
      stoppedAt: undefined,
    });
    expect(upcomingStepRange(run(UNEVEN, {}, optional))).toBeUndefined();
  });

  it('switches to the matching branch once answered', () => {
    expect(projectPath(run(UNEVEN, { kind: 'yes' }, optional)).stageIds).toEqual([
      's1',
      'a1',
      'a2',
      'a3',
    ]);
  });

  describe('the Multi-Stage Template as shipped (no required fields)', () => {
    it('on Applicant, lists the whole default path: Applicant, Individual, Supporting information, Review', () => {
      expect(template(['Applicant'])).toEqual({
        listed: ['Applicant', 'Individual', 'Supporting information', 'Review'],
        range: undefined,
      });
    });

    it('as a business, swaps Individual for Business and still reaches Review by default', () => {
      expect(template(['Applicant'], { [APPLYING_AS]: 'business' }).listed).toEqual([
        'Applicant',
        'Business',
        'Supporting information',
        'Review',
      ]);
    });

    it('as a business needing an inspection, lists all five', () => {
      expect(template(['Applicant'], { [APPLYING_AS]: 'business', tY9uI2oP: true }).listed).toEqual(
        ['Applicant', 'Business', 'Supporting information', 'Inspection', 'Review'],
      );
    });
  });
});

describe('upcomingStepRange (rule 10d)', () => {
  it('is undefined once the path is fully decided — there is nothing to hint at', () => {
    expect(upcomingStepRange(run(UNEVEN, { kind: 'no' }))).toBeUndefined();
  });

  it('spans the shortest and longest branch past the stop', () => {
    expect(upcomingStepRange(run(UNEVEN))).toEqual({ min: 1, max: 3 });
  });

  it('counts a stage shared by every branch once per branch, not as an extra', () => {
    // s1 → x → (yes) a1 → end | (default) end; both reach `end`.
    const diamond = flow(
      [stage('s1'), condition('x', 'kind'), stage('a1'), stage('end')],
      [edge('s1', 'x'), edge('x', 'a1', 'c-x'), edge('a1', 'end'), edge('x', 'end')],
    );
    expect(upcomingStepRange(run(diamond))).toEqual({ min: 1, max: 2 });
  });

  it('skips Form-less stages, exactly as the walk does (rule 10b)', () => {
    const withEmpty = flow(
      [stage('s1'), condition('x', 'kind'), stage('empty', 0), stage('a1'), stage('b1')],
      [edge('s1', 'x'), edge('x', 'empty', 'c-x'), edge('empty', 'a1'), edge('x', 'b1')],
    );
    expect(upcomingStepRange(run(withEmpty))).toEqual({ min: 1, max: 1 });
  });

  it('branches again at a later undecided Condition, but follows a decided one down its one edge', () => {
    // s1 → x → (yes) y → (big) a1 → a2 | (default) b1 ;  x default → end
    const nested = flow(
      [
        stage('s1'),
        condition('x', 'kind'),
        condition('y', 'size', 'big'),
        stage('a1'),
        stage('a2'),
        stage('b1'),
        stage('end'),
      ],
      [
        edge('s1', 'x'),
        edge('x', 'y', 'c-x'),
        edge('y', 'a1', 'c-y'),
        edge('a1', 'a2'),
        edge('y', 'b1'),
        edge('x', 'end'),
      ],
    );
    expect(upcomingStepRange(run(nested))).toEqual({ min: 1, max: 2 });
    // `size` answered "small": y is decided (default → b1), so its two-stage branch no longer counts.
    expect(upcomingStepRange(run(nested, { size: 'small' }))).toEqual({ min: 1, max: 1 });
  });

  it('is undefined when no branch adds a stage', () => {
    const deadEnds = flow([stage('s1'), condition('x', 'kind')], [edge('s1', 'x')]);
    expect(upcomingStepRange(run(deadEnds))).toBeUndefined();
  });

  it('terminates on a hand-edited cycle (rule 17)', () => {
    const cyclic = flow(
      [stage('s1'), condition('x', 'kind'), stage('a1'), stage('a2')],
      [edge('s1', 'x'), edge('x', 'a1', 'c-x'), edge('a1', 'a2'), edge('a2', 'x'), edge('x', 'a2')],
    );
    expect(upcomingStepRange(run(cyclic))).toEqual({ min: 1, max: 2 });
  });
});

describe('ghostCaption (rule 10d)', () => {
  it.each([
    [{ min: 3, max: 3 }, '3 more stages'],
    [{ min: 1, max: 1 }, '1 more stage'],
    [{ min: 0, max: 2 }, 'Up to 2 more stages'],
    [{ min: 0, max: 1 }, 'Up to 1 more stage'],
    [{ min: 2, max: 4 }, '2–4 more stages'],
  ])('%o → %s', (range, caption) => {
    expect(ghostCaption(range)).toBe(caption);
  });
});
