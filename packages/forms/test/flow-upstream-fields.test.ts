import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { upstreamFieldsOf } from '../src/studio/layout/upstream-fields';

// Doc 199 rules 6-9 — upstreamFieldsOf: the fields an applicant has answered before reaching a node.
// Pure; reachability reads the SANITISED flowEdges, never raw options.edges.

const el = (element: object) => element as UISchemaElement;

const control = (key: string, label?: string) =>
  el({ type: 'Control', scope: `#/properties/${key}`, ...(label === undefined ? {} : { label }) });

/** A Stage whose single Form holds `controls`, optionally nested a layout deep. */
const stage = (id: string, controls: object[], nested = false) =>
  el({
    type: 'Stage',
    id,
    elements: [
      {
        type: 'Form',
        elements: nested ? [{ type: 'VerticalLayout', elements: controls }] : controls,
      },
    ],
  });

const condition = (id: string) => el({ type: 'Condition', id, options: { criteria: [] } });

const flow = (elements: object[], pairs: [string, string][] = []) =>
  el({
    type: 'Flow',
    elements,
    options: { edges: pairs.map(([source, target], i) => ({ id: `e${i}`, source, target })) },
  });

const schema: JsonSchema = {
  type: 'object',
  properties: {
    k1: { type: 'string', title: 'Full name' },
    k2: { type: 'number', title: 'Team size' },
    k3: { type: 'boolean', title: 'Subscribed' },
    k4: { type: 'string', title: 'Province', oneOf: [{ const: 'bc', title: 'British Columbia' }] },
    k5: { type: 'string' },
    k6: { type: 'object' },
  },
};

const fieldsFor = (uischema: UISchemaElement, nodeId: string) =>
  upstreamFieldsOf({ schema, uischema }, nodeId);
const keysFor = (uischema: UISchemaElement, nodeId: string) =>
  fieldsFor(uischema, nodeId).map(({ key }) => key);

describe('upstreamFieldsOf (rules 6-7)', () => {
  it('returns the fields of every Stage that reaches the node, with label, kind and options', () => {
    const root = flow([stage('a', [control('k1'), control('k4')]), condition('c')], [['a', 'c']]);
    expect(fieldsFor(root, 'c')).toEqual([
      { key: 'k1', label: 'Full name', kind: 'text' },
      {
        key: 'k4',
        label: 'Province',
        kind: 'choice',
        options: [{ value: 'bc', label: 'British Columbia' }],
      },
    ]);
  });

  it('walks a Stage to its Forms and their Controls at any nesting depth', () => {
    const root = flow([stage('a', [control('k1')], true), condition('c')], [['a', 'c']]);
    expect(keysFor(root, 'c')).toEqual(['k1']);
  });

  it("labels a field by the Control's own label, falling back to the property title", () => {
    const root = flow(
      [stage('a', [control('k1', 'Your name'), control('k2')]), condition('c')],
      [['a', 'c']],
    );
    expect(fieldsFor(root, 'c').map(({ label }) => label)).toEqual(['Your name', 'Team size']);
  });

  it('names an unlabelled, untitled field by its key rather than "Control"', () => {
    const root = flow([stage('a', [control('k5')]), condition('c')], [['a', 'c']]);
    expect(fieldsFor(root, 'c')).toEqual([{ key: 'k5', label: 'k5', kind: 'text' }]);
  });

  it('classifies each field with controlKindOf and carries choiceOptions for a choice', () => {
    const root = flow(
      [stage('a', [control('k1'), control('k2'), control('k3'), control('k4')]), condition('c')],
      [['a', 'c']],
    );
    expect(fieldsFor(root, 'c').map(({ kind }) => kind)).toEqual([
      'text',
      'number',
      'boolean',
      'choice',
    ]);
    // Only a choice carries options.
    expect(fieldsFor(root, 'c').filter((field) => field.options !== undefined)).toHaveLength(1);
  });

  it('skips a Control bound to no known property or to an unsupported type', () => {
    const root = flow(
      [stage('a', [control('gone'), control('k6'), control('k1')]), condition('c')],
      [['a', 'c']],
    );
    expect(keysFor(root, 'c')).toEqual(['k1']);
  });

  it('excludes the fields of a Stage that only comes AFTER the node', () => {
    const root = flow(
      [stage('a', [control('k1')]), condition('c'), stage('b', [control('k2')])],
      [
        ['a', 'c'],
        ['c', 'b'],
      ],
    );
    expect(keysFor(root, 'c')).toEqual(['k1']);
  });

  it('includes fields from every branch that reaches the node, not just one path', () => {
    const root = flow(
      [
        stage('a', [control('k1')]),
        stage('b', [control('k2')]),
        stage('d', [control('k3')]),
        condition('c'),
      ],
      [
        ['a', 'b'],
        ['a', 'd'],
        ['b', 'c'],
        ['d', 'c'],
      ],
    );
    expect(keysFor(root, 'c')).toEqual(['k1', 'k2', 'k3']);
  });

  it('ignores edges the sanitiser drops (unknown end, self-loop)', () => {
    const root = flow(
      [stage('a', [control('k1')]), condition('c')],
      [
        ['a', 'ghost'],
        ['c', 'c'],
      ],
    );
    expect(keysFor(root, 'c')).toEqual([]);
  });

  it('never offers the same key twice', () => {
    const root = flow([stage('a', [control('k1'), control('k1')]), condition('c')], [['a', 'c']]);
    expect(keysFor(root, 'c')).toEqual(['k1']);
  });
});

describe('unreachable and unauthored nodes (rule 8)', () => {
  it('contributes nothing from a Stage with no authored id', () => {
    const unauthored = el({
      type: 'Stage',
      elements: [{ type: 'Form', elements: [control('k1')] }],
    });
    const root = flow([unauthored, stage('a', [control('k2')]), condition('c')], [['a', 'c']]);
    expect(keysFor(root, 'c')).toEqual(['k2']);
  });

  it('returns [] for a node nothing connects to', () => {
    expect(keysFor(flow([stage('a', [control('k1')]), condition('c')]), 'c')).toEqual([]);
  });

  it('returns [] for an unknown node id', () => {
    const root = flow([stage('a', [control('k1')]), condition('c')], [['a', 'c']]);
    expect(keysFor(root, 'nope')).toEqual([]);
  });

  it("never offers a field from the node's own position", () => {
    // A Condition holds no Forms, but a Stage asking about itself must not see its own answers either.
    const root = flow([stage('a', [control('k1')]), stage('b', [control('k2')])], [['a', 'b']]);
    expect(keysFor(root, 'b')).toEqual(['k1']);
  });
});

describe('dangling criteria (rule 9)', () => {
  it('stops offering a field once the edge that made it upstream is removed', () => {
    const connected = flow([stage('a', [control('k1')]), condition('c')], [['a', 'c']]);
    const disconnected = flow([stage('a', [control('k1')]), condition('c')]);
    expect(keysFor(connected, 'c')).toEqual(['k1']);
    expect(keysFor(disconnected, 'c')).toEqual([]);
  });

  it('never rewrites or deletes a criterion whose field is no longer upstream', () => {
    // upstreamFieldsOf only REPORTS what is available; the document is untouched.
    const root = flow([stage('a', [control('k1')]), condition('c')]);
    const before = JSON.stringify(root);
    expect(keysFor(root, 'c')).toEqual([]);
    expect(JSON.stringify(root)).toBe(before);
  });
});
