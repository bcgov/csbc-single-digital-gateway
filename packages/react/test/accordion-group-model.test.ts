import { describe, expect, it } from 'vitest';
import {
  addItemText,
  DEFAULT_ITEM_NOUN,
  emptyAccordionItem,
  emptyStateText,
  isAccordionDefaultOpen,
  itemActionLabel,
  itemNoun,
  normalizeAccordionItems,
  pluralizeNoun,
  resolveDefaultOpen,
} from '../src/jsonforms-renderers/controls/accordion-group/model';

/** A minimal but well-formed Lexical editor state (what RichTextInput emits). */
const editorState = { root: { children: [], type: 'root', version: 1 } };

/**
 * MDD doc 171 — the shared accordion-group model. Every render path calls `normalizeAccordionItems`,
 * so it must coerce ANY unknown JSONB blob without throwing (CLAUDE.md "normalize before use").
 */
describe('accordion-group model (feature 171)', () => {
  describe('normalizeAccordionItems', () => {
    it('returns an empty array for any non-array input', () => {
      for (const input of [null, undefined, '', 42, {}, true, 'items']) {
        expect(normalizeAccordionItems(input)).toEqual([]);
      }
    });

    it('drops entries that are not objects', () => {
      const items = normalizeAccordionItems(['x', 7, null, [], { title: 'ok' }]);
      expect(items).toHaveLength(1);
      expect(items[0]?.title).toBe('ok');
    });

    it('backfills a nanoid(8) id when an item has none', () => {
      const items = normalizeAccordionItems([{ title: 'a' }, { title: 'b', id: '' }]);
      expect(items[0]?.id).toHaveLength(8);
      expect(items[1]?.id).toHaveLength(8);
      expect(items[0]?.id).not.toBe(items[1]?.id);
    });

    it('preserves an existing id rather than regenerating it', () => {
      const items = normalizeAccordionItems([{ id: 'keepme12', title: 'a' }]);
      expect(items[0]?.id).toBe('keepme12');
    });

    it('coerces a non-string title to an empty string', () => {
      const items = normalizeAccordionItems([{ title: 42 }, { title: null }, {}]);
      expect(items.map((i) => i.title)).toEqual(['', '', '']);
    });

    it('coerces a description that is not a plausible Lexical state to null', () => {
      const items = normalizeAccordionItems([
        { description: 'plain text' },
        { description: {} },
        { description: [] },
        { description: 7 },
      ]);
      expect(items.map((i) => i.description)).toEqual([null, null, null, null]);
    });

    it('passes a well-formed Lexical editor state through untouched', () => {
      const items = normalizeAccordionItems([{ title: 'a', description: editorState }]);
      expect(items[0]?.description).toBe(editorState);
    });
  });

  describe('emptyAccordionItem', () => {
    it('returns an item with a fresh id, empty title and null description', () => {
      const item = emptyAccordionItem();
      expect(item.id).toHaveLength(8);
      expect(item.title).toBe('');
      expect(item.description).toBeNull();
    });

    it('returns a different id on each call', () => {
      expect(emptyAccordionItem().id).not.toBe(emptyAccordionItem().id);
    });
  });

  describe('item noun helpers', () => {
    it('defaults the item noun to "item" when itemLabel is unset or blank', () => {
      expect(DEFAULT_ITEM_NOUN).toBe('item');
      for (const input of [undefined, null, '', '   ', 42]) {
        expect(itemNoun(input)).toBe('item');
      }
    });

    it('lower-cases the author noun for the add row and the aria labels', () => {
      expect(addItemText('Question')).toBe('Add question');
      expect(itemActionLabel('Remove', 'Question', 1)).toBe('Remove question 2');
      expect(itemActionLabel('Move up', 'Question', 0)).toBe('Move up question 1');
    });

    it('builds the empty-state text from the item noun', () => {
      expect(emptyStateText('question')).toBe('No questions yet.');
      expect(emptyStateText(undefined)).toBe('No items yet.');
    });

    it('pluralizes a hand-typed noun sensibly', () => {
      expect(pluralizeNoun('question')).toBe('questions');
      expect(pluralizeNoun('entry')).toBe('entries');
      expect(pluralizeNoun('box')).toBe('boxes');
      expect(pluralizeNoun('branch')).toBe('branches');
      expect(pluralizeNoun('day')).toBe('days');
    });
  });

  describe('defaultOpen resolution', () => {
    const items = normalizeAccordionItems([
      { id: 'aaaaaaaa', title: 'one' },
      { id: 'bbbbbbbb', title: 'two' },
    ]);

    it('accepts only the three authored values', () => {
      expect(isAccordionDefaultOpen('none')).toBe(true);
      expect(isAccordionDefaultOpen('first')).toBe(true);
      expect(isAccordionDefaultOpen('all')).toBe(true);
      expect(isAccordionDefaultOpen('specific')).toBe(false);
      expect(isAccordionDefaultOpen(2)).toBe(false);
    });

    it('opens nothing for "none" (the default)', () => {
      expect(resolveDefaultOpen(items, 'none')).toEqual([]);
      expect(resolveDefaultOpen(items, undefined)).toEqual([]);
    });

    it('opens only the first item id for "first"', () => {
      expect(resolveDefaultOpen(items, 'first')).toEqual(['aaaaaaaa']);
    });

    it('opens every item id for "all"', () => {
      expect(resolveDefaultOpen(items, 'all')).toEqual(['aaaaaaaa', 'bbbbbbbb']);
    });

    it('opens nothing for any value when the list is empty', () => {
      for (const mode of ['none', 'first', 'all']) {
        expect(resolveDefaultOpen([], mode)).toEqual([]);
      }
    });
  });
});
