import { describe, expect, it } from 'vitest';
import {
  isRichTextProperty,
  plainRichText,
  richTextHasText,
  richTextValue,
} from '../src/renderers/ui/rich-text-value';
import { blankRichText, emptyRichText, richText } from './rich-text-fixtures';

describe('rich text values (doc 250 rules 1-3)', () => {
  it('isRichTextProperty needs type object and root in required', () => {
    expect(isRichTextProperty({ type: 'object', required: ['root'] })).toBe(true);
    expect(isRichTextProperty({ type: 'object', required: ['a', 'root'] })).toBe(true);
    expect(isRichTextProperty({ type: 'object' })).toBe(false);
    expect(isRichTextProperty({ type: 'string', required: ['root'] })).toBe(false);
    expect(isRichTextProperty({ type: 'object', required: 'root' })).toBe(false);
    expect(isRichTextProperty(undefined)).toBe(false);
  });

  it('richTextValue returns a state with an object root, else undefined', () => {
    const state = richText();
    expect(richTextValue(state)).toBe(state);
    expect(richTextValue({})).toBeUndefined();
    expect(richTextValue({ root: 'x' })).toBeUndefined();
    expect(richTextValue({ root: [] })).toBeUndefined();
    expect(richTextValue('<p>hi</p>')).toBeUndefined();
    expect(richTextValue(null)).toBeUndefined();
  });

  it('richTextHasText finds non-whitespace text at any depth', () => {
    expect(richTextHasText(richTextValue(richText('Hi')))).toBe(true);
    expect(richTextHasText(richTextValue(emptyRichText()))).toBe(false);
    expect(richTextHasText(richTextValue(blankRichText()))).toBe(false);
    expect(richTextHasText(undefined)).toBe(false);
  });
});

describe('plainRichText (doc 251 rule 4)', () => {
  it('wraps a string in one paragraph with one text node, readable as rich text', () => {
    const state = plainRichText('Tell us about you.');
    expect(richTextValue(state)).toBe(state);
    expect(richTextHasText(state)).toBe(true);
    const paragraphs = (
      state.root as unknown as { children: Array<{ type: string; children: unknown[] }> }
    ).children;
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]!.type).toBe('paragraph');
    expect(paragraphs[0]!.children).toEqual([
      expect.objectContaining({ type: 'text', text: 'Tell us about you.' }),
    ]);
  });
});
