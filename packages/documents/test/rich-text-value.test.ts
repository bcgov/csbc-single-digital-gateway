import { describe, expect, it } from 'vitest';
import {
  isRichTextProperty,
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
