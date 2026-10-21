import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { allowedInLayout } from '../src/renderers/gridstack/grid-layouts';
import { REVIEW_TITLE, reviewDocument } from '../src/runner/review-document';
import { richText } from './rich-text-fixtures';

// Doc 213 rules 1-7, 18 — `reviewDocument(flow, stageIds)`: the projected path as ONE Form of Sections. Pure, so
// it is exercised directly; the rendered result is the two caller tests' business.

const el = (element: object) => element as UISchemaElement;
const control = (key: string) => ({ type: 'Control', scope: `#/properties/${key}` });
const form = (label: string | undefined, keys: string[] = [], options?: object) =>
  el({
    ...(label === undefined ? {} : { label }),
    type: 'Form',
    id: `${label ?? 'untitled'}-id`,
    options: { ...options },
    elements: keys.map(control),
  });
const stage = (id: string, label: string, forms: object[]) =>
  el({ type: 'Stage', label, elements: forms, id });
const flow = (elements: object[], options: object = {}) => el({ type: 'Flow', elements, options });

/** The synthesised root, typed enough to read. */
type Doc = { type: string; label?: string; options?: { description?: unknown }; elements: Doc[] };
const docOf = (uischema: UISchemaElement, ids: readonly string[]) =>
  reviewDocument(uischema, ids) as unknown as Doc;

const TWO_STAGE = flow([
  stage('s1', 'Applicant', [form('Contact', ['name'])]),
  stage('s2', 'Details', [form('More', ['note'])]),
]);

describe('the root (rules 1, 5, 7)', () => {
  it('returns a Form', () => {
    expect(docOf(TWO_STAGE, ['s1', 's2']).type).toBe('Form');
  });

  it('labels it with the Flow own label', () => {
    const named = flow([stage('s1', 'Applicant', [form('Contact')])], {});
    (named as unknown as { label: string }).label = 'Apply for a licence';

    expect(docOf(named, ['s1']).label).toBe('Apply for a licence');
  });

  it('falls back to REVIEW_TITLE when the Flow has no label (rule 7)', () => {
    expect(docOf(TWO_STAGE, ['s1']).label).toBe(REVIEW_TITLE);
    expect(REVIEW_TITLE).toBe('Review your answers');
  });

  it('carries the Flow own rich description (rule 5)', () => {
    const described = flow([stage('s1', 'Applicant', [form('Contact')])], {
      description: richText('Check everything below'),
    });

    expect(docOf(described, ['s1']).options?.description).toBeDefined();
  });

  it('carries NO description when the Flow has none — the fallback is gone (rule 6)', () => {
    // Doc 202's plain-text "Check your details before submitting…" is dropped, not fabricated into a
    // Lexical state: a Form description must be rich (doc 207 rule 31), and inventing one is the single
    // thing this transform never does.
    expect(docOf(TWO_STAGE, ['s1']).options?.description).toBeUndefined();
  });

  it('carries no description for a malformed one, rather than crashing Lexical', () => {
    for (const description of ['a sentence', {}, 42, { root: 'no' }]) {
      const bad = flow([stage('s1', 'Applicant', [form('Contact')])], { description });
      expect(docOf(bad, ['s1']).options?.description).toBeUndefined();
    }
  });

  it('authors no variant, gap or inset anywhere — every default applies (rule 18)', () => {
    const doc = docOf(TWO_STAGE, ['s1', 's2']);
    const options = [doc, ...doc.elements].map((node) => node.options ?? {});

    for (const bag of options) {
      expect(bag).not.toHaveProperty('variant');
      expect(bag).not.toHaveProperty('gap');
      expect(bag).not.toHaveProperty('inset');
    }
  });
});

describe('one Section per path Form (rules 2-4)', () => {
  it('returns one Section per Form, in path order', () => {
    const doc = docOf(TWO_STAGE, ['s1', 's2']);

    expect(doc.elements.map((node) => node.type)).toEqual(['Section', 'Section']);
    expect(doc.elements.map((node) => node.label)).toEqual(['Contact', 'More']);
  });

  it('follows the stageIds given, not the document order', () => {
    const doc = docOf(TWO_STAGE, ['s2', 's1']);

    expect(doc.elements.map((node) => node.label)).toEqual(['More', 'Contact']);
  });

  it('returns a Section per Form when a stage holds several', () => {
    const many = flow([stage('s1', 'Applicant', [form('One'), form('Two'), form('Three')])]);

    expect(docOf(many, ['s1']).elements.map((node) => node.label)).toEqual(['One', 'Two', 'Three']);
  });

  it('contributes nothing for a stage holding no Forms', () => {
    const empty = flow([stage('s1', 'Empty', []), stage('s2', 'Details', [form('More')])]);

    expect(docOf(empty, ['s1', 's2']).elements.map((node) => node.label)).toEqual(['More']);
  });

  it('contributes nothing for a stage id that resolves to nothing', () => {
    expect(docOf(TWO_STAGE, ['s1', 'nope']).elements).toHaveLength(1);
  });

  it('gives a Section the Form label and rich description verbatim (rule 3)', () => {
    const value = richText('Tell us how to reach you');
    const described = flow([
      stage('s1', 'Applicant', [form('Contact', ['name'], { description: value })]),
    ]);

    const section = docOf(described, ['s1']).elements[0];
    expect(section?.label).toBe('Contact');
    expect(section?.options?.description).toBe(value);
  });

  it('leaves a Section unlabelled when its Form is', () => {
    const untitled = flow([stage('s1', 'Applicant', [form(undefined, ['name'])])]);

    expect(docOf(untitled, ['s1']).elements[0]).not.toHaveProperty('label');
  });

  it('does NOT carry the Form options.id across — a Section has no identity', () => {
    // Doc 197's id addresses a Form for focus deep linking; nothing is addressed on a review page.
    expect(docOf(TWO_STAGE, ['s1']).elements[0]?.options ?? {}).not.toHaveProperty('id');
  });
});

describe('the children (rule 4)', () => {
  it('passes the Form elements across by reference, never copied', () => {
    const elements = [control('name')];
    const one = el({ type: 'Form', label: 'Contact', elements });
    const single = flow([stage('s1', 'Applicant', [one])]);

    // Identity, not equality: a thousand fields cost one array per Section.
    expect(docOf(single, ['s1']).elements[0]?.elements).toBe(elements);
  });

  it('rewrites nothing inside them — a Grid, a row and a control arrive untouched', () => {
    const nested = [
      { type: 'Grid', elements: [{ type: 'HorizontalLayout', elements: [control('name')] }] },
      control('note'),
    ];
    const rich = flow([
      stage('s1', 'Applicant', [el({ type: 'Form', label: 'Contact', elements: nested })]),
    ]);

    expect(docOf(rich, ['s1']).elements[0]?.elements).toEqual(nested);
  });

  it('carries a Section already authored inside a Form straight through', () => {
    const inner = { type: 'Section', label: 'Mailing address', elements: [control('name')] };
    const authored = flow([
      stage('s1', 'Applicant', [el({ type: 'Form', label: 'Contact', elements: [inner] })]),
    ]);

    const section = docOf(authored, ['s1']).elements[0];
    // Nested one deeper, which is exactly what doc 212 rule 9 derives an h3 from.
    expect(section?.elements[0]).toBe(inner);
  });
});

describe('it is a legal document', () => {
  it('produces only children allowedInLayout for a vertical kind', () => {
    // Why the children transfer untouched: Form and Section are the SAME kind, so this is the identical
    // question either way.
    const doc = docOf(TWO_STAGE, ['s1', 's2']);
    for (const node of doc.elements) expect(allowedInLayout(node.type, 'vertical')).toBe(true);
  });

  it('never mutates the flow it reads', () => {
    const before = JSON.stringify(TWO_STAGE);
    docOf(TWO_STAGE, ['s1', 's2']);

    expect(JSON.stringify(TWO_STAGE)).toBe(before);
  });

  it('returns an empty Form for an empty path, rather than throwing', () => {
    const doc = docOf(TWO_STAGE, []);

    expect(doc.type).toBe('Form');
    expect(doc.elements).toEqual([]);
  });
});
