import type { JsonSchema } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { controlKindOf } from '../src/renderers/ui/control-kind';
import {
  isRichTextProperty,
  richTextIsEmpty,
  richTextValue,
} from '../src/renderers/ui/rich-text-value';
import {
  bareRichText,
  blankRichText,
  emptyRichText,
  richText,
  richTextProperty,
} from './rich-text-fixtures';

// Doc 207 rules 1-5 — what rich content IS, read in ONE place so no two sites can disagree.

describe('isRichTextProperty (rule 1)', () => {
  it('accepts an object property marked rich-text', () => {
    expect(isRichTextProperty(richTextProperty())).toBe(true);
  });

  it('needs BOTH signals — an object alone is not a field', () => {
    expect(isRichTextProperty({ type: 'object' } as JsonSchema)).toBe(false);
  });

  it('needs BOTH signals — requiring root does not make a STRING rich', () => {
    expect(isRichTextProperty({ type: 'string', required: ['root'] } as JsonSchema)).toBe(false);
  });

  it('ignores an object requiring something else, and an absent schema', () => {
    expect(isRichTextProperty({ type: 'object', required: ['other'] } as JsonSchema)).toBe(false);
    expect(isRichTextProperty(undefined)).toBe(false);
  });
});

describe("ControlKind 'rich-text' (rule 2)", () => {
  it('classifies a rich text property', () => {
    expect(controlKindOf(richTextProperty())).toBe('rich-text');
  });

  it('leaves every other kind alone', () => {
    expect(controlKindOf({ type: 'string' })).toBe('text');
    expect(controlKindOf({ type: 'number' })).toBe('number');
    expect(controlKindOf({ type: 'boolean' })).toBe('boolean');
    // A bare object is still not a field at all.
    expect(controlKindOf({ type: 'object' })).toBeUndefined();
  });
});

describe('richTextValue (rules 3-4)', () => {
  it('returns a state that has a root', () => {
    const state = richText();
    expect(richTextValue(state)).toBe(state);
  });

  it('refuses everything that would crash the editor', () => {
    // Rule 4: a malformed-but-object state crashes RichTextInput, and the code panel can author one.
    for (const bad of [undefined, null, '', 'text', 42, true, [], {}, { nope: 1 }, { root: 1 }])
      expect(richTextValue(bad), JSON.stringify(bad)).toBeUndefined();
  });

  it('accepts a state whose root has no children', () => {
    expect(richTextValue(bareRichText())).toBeDefined();
  });
});

describe('richTextIsEmpty (rule 5)', () => {
  it('is false when the state holds text', () => {
    expect(richTextIsEmpty(richText())).toBe(false);
  });

  it('is TRUE for a touched-then-emptied editor', () => {
    // The trap doc 171 records the legacy builder failing: the value is a real object, so a
    // presence-only `required` check would pass with nothing written.
    expect(richTextIsEmpty(emptyRichText())).toBe(true);
  });

  it('is true for whitespace-only text, and for a rootless value', () => {
    expect(richTextIsEmpty(blankRichText())).toBe(true);
    expect(richTextIsEmpty(bareRichText())).toBe(true);
    expect(richTextIsEmpty(undefined)).toBe(true);
  });

  it('finds text nested below the top level', () => {
    const nested = {
      root: {
        children: [
          {
            type: 'list',
            children: [
              {
                type: 'listitem',
                children: [{ type: 'text', text: 'deep', version: 1 }],
                version: 1,
              },
            ],
            version: 1,
          },
        ],
        type: 'root',
        version: 1,
      },
    } as never;
    expect(richTextIsEmpty(nested)).toBe(false);
  });
});
