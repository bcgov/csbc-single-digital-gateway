import { describe, expect, it } from 'vitest';
import {
  categoriesOf,
  clampStepIndex,
  isFlowVariant,
  stepOwnsError,
  stepStatuses,
  type FlowStep,
} from '../src/jsonforms-renderers/layouts/flow/model';

/**
 * Feature 176 — the PURE half of the Categorization "flow" layout.
 *
 * `layouts/flow/model.ts` imports no React and nothing from `@jsonforms/*` at runtime, so every
 * rule below is exercised without mounting a form.
 */

const control = (property: string) => ({
  type: 'Control',
  scope: `#/properties/details/properties/${property}`,
});

const category = (label: string, properties: string[], description?: string) => ({
  type: 'Category',
  label,
  ...(description === undefined ? {} : { options: { description } }),
  elements: properties.map(control),
});

const categorization = (elements: unknown[], variant?: string) => ({
  type: 'Categorization',
  ...(variant === undefined ? {} : { options: { variant } }),
  elements,
});

/** Three steps bound to `details.a` / `details.b` / `details.c`. */
const threeSteps = (): FlowStep[] =>
  categoriesOf(
    categorization([category('One', ['a']), category('Two', ['b']), category('Three', ['c'])]),
  );

describe('flow model — categoriesOf', () => {
  it('returns the direct Category children in document order', () => {
    const steps = categoriesOf(
      categorization([category('Overview', ['a']), category('Resources', ['b'])]),
    );

    expect(steps).toHaveLength(2);
    expect(steps.map((step) => step.label)).toEqual(['Overview', 'Resources']);
    expect(steps[0]?.elements).toHaveLength(1);
  });

  it('ignores non-Category children (matching the tabs renderer filter)', () => {
    const steps = categoriesOf(
      categorization([
        category('Overview', ['a']),
        { type: 'Control', scope: '#/properties/details/properties/stray' },
        { type: 'Group', label: 'Nope', elements: [] },
      ]),
    );

    expect(steps.map((step) => step.label)).toEqual(['Overview']);
  });

  it('returns an empty array for a Categorization with no Category children', () => {
    expect(categoriesOf(categorization([]))).toEqual([]);
  });

  it('tolerates a missing `elements` key without throwing', () => {
    expect(categoriesOf({ type: 'Categorization' })).toEqual([]);
  });

  it('tolerates a non-array `elements` value without throwing', () => {
    expect(categoriesOf({ type: 'Categorization', elements: 'nonsense' })).toEqual([]);
    expect(categoriesOf(null)).toEqual([]);
    expect(categoriesOf(undefined)).toEqual([]);
  });

  it('coerces a non-string `label` to an empty label rather than throwing', () => {
    const steps = categoriesOf({
      type: 'Categorization',
      elements: [{ type: 'Category', label: 42, elements: [] }],
    });

    expect(steps).toHaveLength(1);
    expect(steps[0]?.label).toBe('');
  });

  it('reads options.description, defaulting to an empty string when absent', () => {
    const steps = categoriesOf(
      categorization([category('With', ['a'], 'Tell them why'), category('Without', ['b'])]),
    );

    expect(steps[0]?.description).toBe('Tell them why');
    expect(steps[1]?.description).toBe('');
  });
});

describe('flow model — variant detection', () => {
  it("reports flow for options.variant === 'flow'", () => {
    expect(isFlowVariant(categorization([], 'flow'))).toBe(true);
  });

  it('reports not-flow when options is absent entirely (every Categorization authored to date)', () => {
    expect(isFlowVariant(categorization([]))).toBe(false);
  });

  it("reports not-flow for an unrecognised variant such as 'stepper'", () => {
    expect(isFlowVariant(categorization([], 'stepper'))).toBe(false);
    expect(isFlowVariant(categorization([], 'FLOW'))).toBe(false);
  });

  it('reports not-flow for a malformed options value (null, array, primitive)', () => {
    expect(isFlowVariant({ type: 'Categorization', options: null })).toBe(false);
    expect(isFlowVariant({ type: 'Categorization', options: ['flow'] })).toBe(false);
    expect(isFlowVariant({ type: 'Categorization', options: 'flow' })).toBe(false);
    expect(isFlowVariant(null)).toBe(false);
  });
});

describe('flow model — error ownership', () => {
  it('attributes an error to the category whose scope path matches its instancePath', () => {
    const [one, two] = threeSteps();

    expect(stepOwnsError(one as FlowStep, [{ instancePath: '/details/a' }])).toBe(true);
    expect(stepOwnsError(two as FlowStep, [{ instancePath: '/details/a' }])).toBe(false);
  });

  it('prefix-matches, so a nested array-item error (/details/faq/0/question) lands on the category', () => {
    const step = categoriesOf(categorization([category('Resources', ['faq'])]))[0] as FlowStep;

    expect(stepOwnsError(step, [{ instancePath: '/details/faq/0/question' }])).toBe(true);
  });

  it("prefix-matches, so a parent object's `required` error lands on the category", () => {
    // Ajv reports a missing required property against the PARENT object, not the absent child.
    const step = categoriesOf(categorization([category('Resources', ['faq'])]))[0] as FlowStep;

    expect(stepOwnsError(step, [{ instancePath: '/details' }])).toBe(true);
  });

  it('attributes an error matching no category to no category at all', () => {
    const steps = threeSteps();
    const rootError = [{ instancePath: '' }];
    const strangerError = [{ instancePath: '/somewhere/else' }];

    expect(steps.every((step) => !stepOwnsError(step, rootError))).toBe(true);
    expect(steps.every((step) => !stepOwnsError(step, strangerError))).toBe(true);
  });

  it('attributes an error to every category that owns the scope when two share one', () => {
    const shared = categoriesOf(
      categorization([category('First', ['a']), category('Second', ['a'])]),
    );
    const error = [{ instancePath: '/details/a' }];

    expect(shared.every((step) => stepOwnsError(step, error))).toBe(true);
  });

  it('owns nothing when the step has no scoped controls, or there are no errors', () => {
    const empty = categoriesOf(categorization([category('Empty', [])]))[0] as FlowStep;

    expect(stepOwnsError(empty, [{ instancePath: '/details/a' }])).toBe(false);
    expect(stepOwnsError(threeSteps()[0] as FlowStep, [])).toBe(false);
  });
});

describe('flow model — step status', () => {
  it("marks the current index 'current'", () => {
    expect(stepStatuses(threeSteps(), 1, [])[1]).toBe('current');
  });

  it("marks every index after the current one 'upcoming', regardless of its errors", () => {
    const statuses = stepStatuses(threeSteps(), 0, [
      { instancePath: '/details/b' },
      { instancePath: '/details/c' },
    ]);

    expect(statuses).toEqual(['current', 'upcoming', 'upcoming']);
  });

  it("marks an earlier index with no owned error 'valid'", () => {
    expect(stepStatuses(threeSteps(), 2, [])).toEqual(['valid', 'valid', 'current']);
  });

  it("marks an earlier index owning at least one error 'invalid'", () => {
    const statuses = stepStatuses(threeSteps(), 2, [{ instancePath: '/details/b' }]);

    expect(statuses).toEqual(['valid', 'invalid', 'current']);
  });

  it('resolves status by index, not by visit history — jumping to step 4 flags steps 1-3', () => {
    // Nothing was visited; the rail still reports the real validity of every earlier step.
    const statuses = stepStatuses(threeSteps(), 2, [
      { instancePath: '/details/a' },
      { instancePath: '/details/b' },
    ]);

    expect(statuses).toEqual(['invalid', 'invalid', 'current']);
  });

  it('clamps an out-of-range current index into the available step range', () => {
    expect(clampStepIndex(9, 3)).toBe(2);
    expect(clampStepIndex(-4, 3)).toBe(0);
    expect(clampStepIndex(1, 0)).toBe(0);
    expect(clampStepIndex(Number.NaN, 3)).toBe(0);

    expect(stepStatuses(threeSteps(), 99, [])).toEqual(['valid', 'valid', 'current']);
  });
});
