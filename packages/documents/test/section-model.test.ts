import { describe, expect, it } from 'vitest';
import {
  INSET_CLASS,
  SECTION_INSETS,
  SECTION_VARIANTS,
  sectionDescription,
  sectionHeadingLevel,
  sectionInset,
  sectionTitle,
  sectionVariant,
} from '../src/renderers/ui/section-model';

describe('section model (doc 278 rules 1, 3, 6, 9-11)', () => {
  it('reads a non-blank trimmed title and description, else none', () => {
    const section = { type: 'Section', label: '  About you ', options: { description: ' Why \n' } };
    expect(sectionTitle(section)).toBe('About you');
    expect(sectionDescription(section)).toBe('Why');
    expect(sectionTitle({ type: 'Section', label: '   ' })).toBeUndefined();
    expect(sectionTitle({ type: 'Section', label: 3 })).toBeUndefined();
    expect(sectionDescription({ type: 'Section', options: { description: { root: {} } } })).toBe(
      undefined,
    );
    expect(sectionDescription({ type: 'Section' })).toBeUndefined();
    expect(sectionDescription(null)).toBeUndefined();
  });

  it('sanitises the variant: plain or container, anything else plain', () => {
    expect(SECTION_VARIANTS).toEqual(['plain', 'container']);
    expect(Object.isFrozen(SECTION_VARIANTS)).toBe(true);
    expect(sectionVariant({ variant: 'container' })).toBe('container');
    expect(sectionVariant({ variant: 'plain' })).toBe('plain');
    expect(sectionVariant({ variant: 'boxed' })).toBe('plain');
    expect(sectionVariant(undefined)).toBe('plain');
    expect(sectionVariant('container')).toBe('plain');
  });

  it('sanitises the inset: xs-xl, anything else md, each a literal padding class', () => {
    expect(SECTION_INSETS).toEqual(['xs', 'sm', 'md', 'lg', 'xl']);
    expect(Object.isFrozen(SECTION_INSETS)).toBe(true);
    expect(sectionInset({ inset: 'xl' })).toBe('xl');
    expect(sectionInset({ inset: 'none' })).toBe('md');
    expect(sectionInset({ inset: 2 })).toBe('md');
    expect(sectionInset(null)).toBe('md');
    expect(INSET_CLASS).toEqual({ xs: 'p-1', sm: 'p-2', md: 'p-4', lg: 'p-6', xl: 'p-8' });
  });

  it('derives the heading level from depth: h2 at the top, capped at h6', () => {
    expect(sectionHeadingLevel(0)).toBe(2);
    expect(sectionHeadingLevel(1)).toBe(3);
    expect(sectionHeadingLevel(3)).toBe(5);
    expect(sectionHeadingLevel(4)).toBe(6);
    expect(sectionHeadingLevel(9)).toBe(6);
    expect(sectionHeadingLevel(-2)).toBe(2);
    expect(sectionHeadingLevel(1.7)).toBe(3);
  });
});
