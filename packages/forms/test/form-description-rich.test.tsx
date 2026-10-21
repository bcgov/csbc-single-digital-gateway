import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { formDescriptionOf } from '../src/renderers/gridstack/form-renderer';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { validateUischemaDocument } from '../src/studio/code/validate-document';
import { STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';
import { richText } from './rich-text-fixtures';

// Doc 207 rules 30-34 — the Form description becomes rich content. USER DECISION: rich text only; a plain
// string no longer renders.

const form = (description?: unknown): UISchemaElement =>
  ({
    type: 'Form',
    label: 'A form',
    elements: [],
    ...(description === undefined ? {} : { options: { description } }),
  }) as unknown as UISchemaElement;

describe('formDescriptionOf (rule 30)', () => {
  it('returns an authored editor state', () => {
    const state = richText('Guidance for the applicant');
    expect(formDescriptionOf(form(state))).toBe(state);
  });

  it('returns undefined for a plain STRING — the deliberate break', () => {
    expect(formDescriptionOf(form('Old plain description'))).toBeUndefined();
  });

  it('returns undefined for an absent or malformed description', () => {
    expect(formDescriptionOf(form())).toBeUndefined();
    expect(formDescriptionOf(form({ nope: 1 }))).toBeUndefined();
  });
});

describe('the metaschema (rule 32)', () => {
  it('accepts a rich description at the apply gate', () => {
    expect(validateUischemaDocument(form(richText())).valid).toBe(true);
  });

  it('REFUSES a plain string description, so the gate agrees with the renderer', () => {
    // Rule 32: if the metaschema still said `type: 'string'`, the gate would refuse every document the
    // inspector now produces — and if it accepted both, an author could save something that renders nothing.
    expect(validateUischemaDocument(form('Old plain description')).valid).toBe(false);
  });

  it('still accepts a Form with no description', () => {
    expect(validateUischemaDocument(form()).valid).toBe(true);
  });

  it('no longer describes the description as a string', () => {
    const text = JSON.stringify(UISCHEMA_METASCHEMA);
    expect(text).toContain('description');
    expect(text).toContain('rich');
  });
});

describe('the in-repo samples (rule 33)', () => {
  it('the studio sample carries a RICH description, not a string', () => {
    const description = (STUDIO_SAMPLE_UISCHEMA as { options?: { description?: unknown } }).options
      ?.description;
    expect(typeof description).not.toBe('string');
    expect(formDescriptionOf(STUDIO_SAMPLE_UISCHEMA)).toBeDefined();
  });

  it('the studio sample still applies cleanly', () => {
    expect(validateUischemaDocument(STUDIO_SAMPLE_UISCHEMA).valid).toBe(true);
  });
});
