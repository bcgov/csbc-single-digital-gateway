import { describe, it, expect } from 'vitest';
import { documentText, parseDocumentText } from '../src/studio/code/document-text';
import {
  validateSchemaDocument,
  validateUischemaDocument,
} from '../src/studio/code/validate-document';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';

// Doc 191 rules 15-16, 18 — editor text for a document half, and the apply gate.

describe('Form Studio document text (doc 191)', () => {
  describe('documentText (rule 15)', () => {
    it('formats a value as two-space indented JSON', () => {
      const text = documentText({ type: 'object', required: ['a'] });
      expect(text).toBe('{\n  "type": "object",\n  "required": [\n    "a"\n  ]\n}');
      expect(JSON.parse(text)).toEqual({ type: 'object', required: ['a'] });
      // The sample's root is a Form (doc 192 rule 8).
      expect(documentText(STUDIO_SAMPLE_UISCHEMA).startsWith('{\n  "type": "Form"')).toBe(true);
    });
  });

  describe('parseDocumentText (rule 16a)', () => {
    it('returns the parsed value for valid JSON', () => {
      expect(parseDocumentText('{ "type": "Heading", "text": "H" }')).toEqual({
        ok: true,
        value: { type: 'Heading', text: 'H' },
      });
      expect(parseDocumentText('[1]')).toEqual({ ok: true, value: [1] });
    });

    it('returns a parse problem for malformed JSON, comments and trailing commas', () => {
      for (const text of ['{', '{ "a": 1, }', '// c\n{}', '']) {
        const parsed = parseDocumentText(text);
        expect(parsed.ok, text).toBe(false);
        if (!parsed.ok) {
          expect(parsed.problem.path).toBe('');
          expect(parsed.problem.message).toMatch(/^Invalid JSON: /);
        }
      }
    });
  });

  describe('validateSchemaDocument (rules 16b-c)', () => {
    it('is valid for a studio-profile schema', () => {
      const result = validateSchemaDocument(STUDIO_SAMPLE_SCHEMA);
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.value).toBe(STUDIO_SAMPLE_SCHEMA);
    });

    it('reports metaschema problems with instancePath and message', () => {
      // `integer` is a valid type now (doc 204 rule 20), so the invalid TYPE here is `decimal`.
      const result = validateSchemaDocument({
        type: 'object',
        properties: { a: { type: 'decimal', maxLength: -1 } },
      });
      expect(result.valid).toBe(false);
      if (result.valid) return;
      expect(result.problems.map((problem) => problem.path)).toEqual(
        expect.arrayContaining(['/properties/a/type', '/properties/a/maxLength']),
      );
      expect(result.problems.every((problem) => problem.message.length > 0)).toBe(true);
    });

    it('reports a problem when Ajv cannot compile the schema instead of throwing', () => {
      // minLength is outside the profile (allowed, unchecked) but -1 makes the schema itself invalid.
      const result = validateSchemaDocument({
        type: 'object',
        properties: { a: { type: 'string', minLength: -1 } },
      });
      expect(result.valid).toBe(false);
      if (result.valid) return;
      expect(result.problems).toHaveLength(1);
      expect(result.problems[0]?.path).toBe('');
      expect(result.problems[0]?.message).toMatch(/schema is invalid/);
      // The same value checked twice gives the same answer (nothing cached from the failed compile).
      expect(
        validateSchemaDocument({
          type: 'object',
          properties: { a: { type: 'string', minLength: -1 } },
        }).valid,
      ).toBe(false);
    });

    it('rejects a JSON value that is not an object (array, string, null)', () => {
      for (const value of [[], 'object', null]) {
        const result = validateSchemaDocument(value);
        expect(result.valid, JSON.stringify(value)).toBe(false);
        if (!result.valid) expect(result.problems[0]?.path).toBe('');
      }
    });
  });

  describe('validateUischemaDocument (rule 16b)', () => {
    it('is valid for the studio sample uischema', () => {
      const result = validateUischemaDocument(STUDIO_SAMPLE_UISCHEMA);
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.value).toBe(STUDIO_SAMPLE_UISCHEMA);
    });

    it('reports an unknown element type with its path', () => {
      const result = validateUischemaDocument({
        type: 'VerticalLayout',
        elements: [
          { type: 'Heading', text: 'H' },
          { type: 'Group', elements: [] },
        ],
      });
      expect(result.valid).toBe(false);
      if (result.valid) return;
      expect(result.problems).toContainEqual(expect.objectContaining({ path: '/elements/1/type' }));
      expect(result.problems.some((problem) => problem.message.includes('then'))).toBe(false);
    });
  });
});
