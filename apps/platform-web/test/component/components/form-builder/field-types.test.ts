import { describe, expect, it } from 'vitest';
import {
  FIELD_TYPES,
  FIELD_TYPE_BY_ID,
  CHOICE_FIELD_TYPES,
} from '@/components/form-builder/field-types';

describe('Field Types Component Test Suite', () => {
  it('contains valid and unique IDs for all field types', () => {
    expect(FIELD_TYPES.length).toBeGreaterThan(0);

    const ids = FIELD_TYPES.map((t) => t.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });

  it('maps FIELD_TYPE_BY_ID correctly to all catalogue elements', () => {
    FIELD_TYPES.forEach((t) => {
      expect(FIELD_TYPE_BY_ID[t.id]).toEqual(t);
    });
  });

  it('defines the choice fields set correctly', () => {
    expect(CHOICE_FIELD_TYPES).toBeInstanceOf(Set);
    expect(CHOICE_FIELD_TYPES.has('select')).toBe(true);
    expect(CHOICE_FIELD_TYPES.has('radio')).toBe(true);
    expect(CHOICE_FIELD_TYPES.has('checkboxes')).toBe(true);

    // Non-choice fields shouldn't be in the set.
    expect(CHOICE_FIELD_TYPES.has('text')).toBe(false);
    expect(CHOICE_FIELD_TYPES.has('heading')).toBe(false);
  });

  it('classifies groups and layout containers correctly', () => {
    const layoutTypes = FIELD_TYPES.filter((t) => t.group === 'Layout');
    expect(layoutTypes.length).toBeGreaterThan(0);
    layoutTypes.forEach((t) => {
      expect(t.kind).toBe('container');
    });

    const displayTypes = FIELD_TYPES.filter((t) => t.group === 'Display');
    expect(displayTypes.length).toBeGreaterThan(0);
    displayTypes.forEach((t) => {
      expect(t.kind).toBe('display');
    });
  });
});

describe('Accordion group palette entry (feature 171)', () => {
  it('registers accordiongroup as a control in the Advanced group', () => {
    const def = FIELD_TYPE_BY_ID.accordiongroup;
    expect(def).toBeDefined();
    expect(def?.kind).toBe('control');
    expect(def?.group).toBe('Advanced');
    expect(def?.label).toBe('Accordion group');
    expect(def?.keywords).toContain('faq');
  });

  it('is not a choice field type', () => {
    expect(CHOICE_FIELD_TYPES.has('accordiongroup')).toBe(false);
  });
});

describe('Section palette entry (feature 172)', () => {
  it('registers section as a container in the Layout group', () => {
    const def = FIELD_TYPE_BY_ID.section;
    expect(def).toBeDefined();
    expect(def?.kind).toBe('container');
    expect(def?.group).toBe('Layout');
    expect(def?.label).toBe('Section');
    expect(def?.keywords).toContain('fieldset');
  });

  it('sits alongside the other layout containers', () => {
    const layoutContainers = FIELD_TYPES.filter(
      (t) => t.group === 'Layout' && t.kind === 'container',
    ).map((t) => t.id);
    expect(layoutContainers).toEqual(
      expect.arrayContaining(['group', 'horizontal', 'grid', 'section']),
    );
  });
});
