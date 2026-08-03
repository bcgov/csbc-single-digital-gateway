import { describe, expect, it, vi } from 'vitest';
import Ajv from 'ajv';
import { validateData } from '../../../../../src/modules/service-agreements/util/validate-data';

describe('validateData', () => {
  it('returns valid true when data matches schema', () => {
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
    };
    const data = { title: 'Agreement Title' };

    const result = validateData(schema, data);

    expect(result).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('returns valid false and mapped errors when data violates schema constraints', () => {
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        age: { type: 'number', minimum: 18 },
      },
      required: ['title'],
    };
    const data = { age: 10 };

    const result = validateData(schema, data);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("(root) must have required property 'title'");
    expect(result.errors).toContain('/age must be >= 18');
  });

  it('ignores presentation keywords cleanly without strict mode errors', () => {
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string', options: { detail: 'something presentation-specific' } },
      },
      required: ['title'],
    };
    const data = { title: 'Pol' };

    const result = validateData(schema, data);

    expect(result.valid).toBe(true);
  });

  it('handles case where validate.errors is nullish', () => {
    const compileSpy = vi.spyOn(Ajv.prototype, 'compile');
    const mockValidate = Object.assign(() => false, { errors: null });
    compileSpy.mockReturnValue(mockValidate as any);

    const result = validateData({}, {});
    expect(result).toEqual({ valid: false, errors: [] });

    compileSpy.mockRestore();
  });

  it('handles case where error message is missing', () => {
    const compileSpy = vi.spyOn(Ajv.prototype, 'compile');
    const mockValidate = Object.assign(() => false, {
      errors: [{ instancePath: '/path', message: undefined }],
    });
    compileSpy.mockReturnValue(mockValidate as any);

    const result = validateData({}, {});
    expect(result).toEqual({ valid: false, errors: ['/path is invalid'] });

    compileSpy.mockRestore();
  });
});
