import { describe, expect, it } from 'vitest';
import {
  FIELD_TYPES,
  FIELD_TYPE_BY_ID,
  ENUM_FIELD_TYPES,
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

  it('defines enum fields set correctly', () => {
    expect(ENUM_FIELD_TYPES).toBeInstanceOf(Set);
    expect(ENUM_FIELD_TYPES.has('select')).toBe(true);
    expect(ENUM_FIELD_TYPES.has('radio')).toBe(true);
    expect(ENUM_FIELD_TYPES.has('multiselect')).toBe(true);
    expect(ENUM_FIELD_TYPES.has('oneof')).toBe(true);

    // Some non-enum fields shouldn't be in the set
    expect(ENUM_FIELD_TYPES.has('text')).toBe(false);
    expect(ENUM_FIELD_TYPES.has('heading')).toBe(false);
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
