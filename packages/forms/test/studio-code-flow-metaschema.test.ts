import { createAjv } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { validateUischemaDocument } from '../src/studio/code/validate-document';
import { createElementIds } from '../src/studio/layout/element-ids';
import { addTargetId, insertElement } from '../src/studio/layout/insert-element';
import { newPropertyKey } from '../src/studio/layout/schema-properties';
import { PALETTE_TEMPLATES } from '../src/studio/palette/palette-templates';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';

// Doc 195 rules 17-18 — the uischema apply gate for Flow roots.

const ajv = createAjv();
const ok = (value: unknown) => ajv.validate(UISCHEMA_METASCHEMA, value) === true;

const form = (extra: object = {}) => ({ type: 'Form', elements: [], ...extra });
const stage = (id: string, elements: object[] = [form()], options: object = {}) => ({
  type: 'Stage',
  elements,
  options: { id, ...options },
});
const flow = (elements: object[], edges?: object[]) => ({
  type: 'Flow',
  elements,
  ...(edges ? { options: { edges } } : {}),
});
const edge = (id: string, source: string, target: string) => ({ id, source, target });

describe('uischema metaschema — Flow root (rule 17)', () => {
  it('accepts a Flow of Stages of Forms with edges and positions', () => {
    expect(ok(flow([]))).toBe(true);
    expect(
      ok({
        type: 'Flow',
        label: 'Application',
        rule: { effect: 'SHOW', condition: { scope: '#/properties/a', schema: { const: true } } },
        options: { edges: [edge('e1', 's1', 's2')] },
        elements: [
          {
            ...stage(
              's1',
              [form({ label: 'Contact', elements: [{ type: 'Heading', text: 'H' }] })],
              {
                position: { x: 0, y: -12.5 },
              },
            ),
            label: 'Applicant',
          },
          stage('s2', []),
        ],
      }),
    ).toBe(true);
  });

  it('still accepts the Form sample and every palette template output (doc 191 rule 14)', () => {
    expect(ok(STUDIO_SAMPLE_UISCHEMA)).toBe(true);
    const ids = createElementIds();
    const document = { schema: STUDIO_SAMPLE_SCHEMA, uischema: STUDIO_SAMPLE_UISCHEMA };
    // Doc 198 rule 19: the Flow group is gone, so every remaining template is a layout one.
    for (const { key } of PALETTE_TEMPLATES) {
      const target = { gridId: addTargetId(STUDIO_SAMPLE_UISCHEMA, null, ids) };
      const result = insertElement(document, key, target, ids, newPropertyKey);
      expect(result.inserted, key).toBeDefined();
      expect(ok(result.uischema), key).toBe(true);
    }
  });

  it('refuses a Flow holding a non-Stage element', () => {
    expect(ok(flow([form()]))).toBe(false);
    expect(ok(flow([{ type: 'Heading', text: 'x' }]))).toBe(false);
    expect(ok(flow([stage('s1'), { type: 'Grid', elements: [] }]))).toBe(false);
  });

  it('refuses a Stage holding a non-Form element', () => {
    expect(ok(flow([stage('s1', [{ type: 'Grid', elements: [] }])]))).toBe(false);
    expect(ok(flow([stage('s1', [stage('s2')])]))).toBe(false);
    expect(ok(flow([stage('s1', [flow([])])]))).toBe(false);
  });

  it('refuses a Stage without options.id, or with an empty id', () => {
    expect(ok(flow([{ type: 'Stage', elements: [] }]))).toBe(false);
    expect(ok(flow([{ type: 'Stage', elements: [], options: {} }]))).toBe(false);
    expect(ok(flow([stage('')]))).toBe(false);
    expect(ok(flow([{ type: 'Stage', elements: [], options: { id: 7 } }]))).toBe(false);
  });

  it('refuses a position missing x or y, and an edge missing id, source or target', () => {
    expect(ok(flow([stage('s1', [], { position: { x: 1 } })]))).toBe(false);
    expect(ok(flow([stage('s1', [], { position: { x: 1, y: '2' } })]))).toBe(false);
    const two = [stage('s1'), stage('s2')];
    expect(ok(flow(two, [{ id: 'e1', source: 's1' }]))).toBe(false);
    expect(ok(flow(two, [{ source: 's1', target: 's2' }]))).toBe(false);
    expect(ok(flow(two, [edge('e1', '', 's2')]))).toBe(false);
    expect(ok({ type: 'Flow', elements: two, options: { edges: 'none' } })).toBe(false);
  });

  it('refuses Flow, Stage and Form nested inside a Form (element enum unchanged)', () => {
    for (const nested of [flow([]), stage('s1'), form()]) {
      const direct = validateUischemaDocument(form({ elements: [nested] }));
      expect(direct.valid, nested.type).toBe(false);
      const deep = validateUischemaDocument(
        form({ elements: [{ type: 'VerticalLayout', elements: [nested] }] }),
      );
      expect(deep.valid, nested.type).toBe(false);
    }
  });

  it('carries no description on the root Flow/Form if condition', () => {
    const [branch] = UISCHEMA_METASCHEMA.allOf;
    expect(branch.if).toEqual({ properties: { type: { const: 'Flow' } }, required: ['type'] });
    expect(branch.if).not.toHaveProperty('description');
    expect(branch.then).toEqual({ $ref: '#/definitions/flow' });
    expect(branch.else).toEqual({ $ref: '#/definitions/form' });
    // A non-Flow root is still checked as a Form.
    expect(ok({ type: 'VerticalLayout', elements: [] })).toBe(false);
    expect(ok({ elements: [] })).toBe(false);
  });
});

describe('validateUischemaDocument — flowProblems (rule 18)', () => {
  it('returns valid for a metaschema-valid, acyclic Flow', () => {
    const document = flow(
      [stage('a'), stage('b'), stage('c')],
      [edge('e1', 'a', 'b'), edge('e2', 'a', 'c'), edge('e3', 'b', 'c')],
    );
    const result = validateUischemaDocument(document);
    expect(result.valid).toBe(true);
    expect(result.valid && result.value).toBe(document);
  });

  it('refuses duplicate Stage ids, dangling edge ends, self-loops, duplicate edges and cycles with instance paths', () => {
    const result = validateUischemaDocument(
      flow(
        [stage('a'), stage('b'), stage('a')],
        [
          edge('e1', 'a', 'b'),
          edge('e2', 'b', 'ghost'),
          edge('e3', 'b', 'b'),
          edge('e4', 'a', 'b'),
          edge('e5', 'b', 'a'),
        ],
      ),
    );
    expect(result.valid).toBe(false);
    expect(result.valid ? [] : result.problems).toEqual([
      { path: '/elements/2/options/id', message: 'Stage id "a" is already used.' },
      { path: '/options/edges/1/target', message: 'No Stage has id "ghost".' },
      { path: '/options/edges/2', message: 'An edge cannot connect a Stage to itself.' },
      { path: '/options/edges/3', message: 'This edge is already defined.' },
      { path: '/options/edges/4', message: 'This edge would create a cycle.' },
    ]);
  });

  it('does not run flowProblems for a Form root', () => {
    const looped = form({ options: { edges: [edge('e1', 'x', 'x')] } });
    expect(validateUischemaDocument(looped).valid).toBe(true);
  });
});
