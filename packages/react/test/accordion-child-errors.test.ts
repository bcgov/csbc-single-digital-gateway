import type { ErrorObject } from 'ajv';
import { describe, expect, it } from 'vitest';
import {
  instancePathPrefix,
  itemErrorMessage,
  itemFieldErrors,
  messagesForIndex,
} from '../src/jsonforms-renderers/controls/accordion-group/child-errors';

const error = (instancePath: string, keyword: string, params: object = {}): ErrorObject =>
  ({ instancePath, keyword, params, schemaPath: '', message: '' }) as ErrorObject;

/**
 * MDD doc 171, rule 16 — a control bound to an array never receives its items' errors through
 * JSONForms' `errors` prop, so the accordion claims them from `core.errors`. This is the pure part
 * of that: which errors belong to which row and field.
 */
describe('accordion item errors (feature 171)', () => {
  describe('instancePathPrefix', () => {
    it('converts a top-level dot path to an Ajv slash path', () => {
      expect(instancePathPrefix('faq')).toBe('/faq');
    });

    it('converts a nested path, so an accordion inside a layout or stage still matches', () => {
      expect(instancePathPrefix('stages.0.faq')).toBe('/stages/0/faq');
    });

    it('maps the root path to an empty prefix', () => {
      expect(instancePathPrefix('')).toBe('');
    });
  });

  describe('itemFieldErrors', () => {
    it('claims a keyword failure on an item field', () => {
      const errors = [error('/faq/0/title', 'pattern')];
      expect(itemFieldErrors(errors, 'faq')).toEqual([
        { index: 0, field: 'title', keyword: 'pattern' },
      ]);
    });

    it('claims a required failure reported on the item OBJECT', () => {
      // Ajv puts the field name in params.missingProperty, not in the path — dropping this shape
      // would lose the "never filled it in" case entirely.
      const errors = [error('/faq/1', 'required', { missingProperty: 'description' })];
      expect(itemFieldErrors(errors, 'faq')).toEqual([
        { index: 1, field: 'description', keyword: 'required' },
      ]);
    });

    it('ignores errors at the control\u2019s OWN path', () => {
      // minItems belongs to the control itself and already renders via ControlWrapper — claiming it
      // here would render the same message twice.
      expect(itemFieldErrors([error('/faq', 'minItems')], 'faq')).toEqual([]);
    });

    it('ignores errors belonging to a different field', () => {
      expect(itemFieldErrors([error('/other/0/title', 'pattern')], 'faq')).toEqual([]);
    });

    it('does not confuse a sibling whose name shares a prefix', () => {
      expect(itemFieldErrors([error('/faq_extra/0/title', 'pattern')], 'faq')).toEqual([]);
    });

    it('resolves errors for an accordion nested inside a layout', () => {
      const errors = [error('/stages/0/faq/2/title', 'pattern')];
      expect(itemFieldErrors(errors, 'stages.0.faq')).toEqual([
        { index: 2, field: 'title', keyword: 'pattern' },
      ]);
    });

    it('keeps errors from several rows apart', () => {
      const errors = [
        error('/faq/0/title', 'pattern'),
        error('/faq/2/description', 'type'),
        error('/faq/2', 'required', { missingProperty: 'title' }),
      ];
      expect(itemFieldErrors(errors, 'faq')).toEqual([
        { index: 0, field: 'title', keyword: 'pattern' },
        { index: 2, field: 'description', keyword: 'type' },
        { index: 2, field: 'title', keyword: 'required' },
      ]);
    });
  });

  describe('messages', () => {
    it('states the requirement in words, not in Ajv keywords', () => {
      // "must match pattern \"\\S\"" means nothing to someone filling in a form.
      expect(itemErrorMessage('title')).toBe('Title is required');
      expect(itemErrorMessage('description')).toBe('Description is required');
    });

    it('falls back to the raw field name for an unknown field', () => {
      expect(itemErrorMessage('other')).toBe('other is required');
    });

    it('collects only the messages for the requested row', () => {
      const errors = [
        { index: 0, field: 'title', keyword: 'pattern' },
        { index: 1, field: 'description', keyword: 'type' },
      ];
      expect(messagesForIndex(errors, 0)).toEqual({ title: 'Title is required' });
      expect(messagesForIndex(errors, 1)).toEqual({ description: 'Description is required' });
      expect(messagesForIndex(errors, 2)).toEqual({});
    });

    it('reports one message per field even when a field fails twice', () => {
      const errors = [
        { index: 0, field: 'title', keyword: 'required' },
        { index: 0, field: 'title', keyword: 'pattern' },
      ];
      expect(messagesForIndex(errors, 0)).toEqual({ title: 'Title is required' });
    });
  });
});
