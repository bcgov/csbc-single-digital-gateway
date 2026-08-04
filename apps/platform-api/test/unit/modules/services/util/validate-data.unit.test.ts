import { describe, expect, it, vi } from 'vitest';
import { validateData } from '../../../../../src/modules/services/util/validate-data';

vi.mock('ajv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ajv')>();
  return {
    default: class MockAjv extends actual.default {
      override compile(schema: any): any {
        const validate = super.compile(schema);
        const wrapper = Object.assign(
          (data: any) => {
            const res = validate(data);
            if ((globalThis as any).mockErrorsNull) {
              (wrapper as any).errors = null as any;
            } else if ((globalThis as any).mockErrorMessageNull) {
              (wrapper as any).errors = [{ instancePath: '/test', message: undefined }] as any;
            } else {
              (wrapper as any).errors = validate.errors;
            }
            return res;
          },
          {
            schema: validate.schema,
            schemaEnv: validate.schemaEnv,
            errors: validate.errors,
          },
        );
        return wrapper as any;
      }
    },
  };
});

describe('validateData utility tests', () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'integer', minimum: 0 },
    },
    required: ['name'],
  };

  it('returns valid true when data matches the schema', () => {
    const data = { name: 'Lewis', age: 30 };
    const result = validateData(schema, data);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns valid false and lists error messages when data does not match the schema', () => {
    const data = { age: -5 }; // missing required 'name' and invalid 'age'
    const result = validateData(schema, data);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain("(root) must have required property 'name'");
    expect(result.errors).toContain('/age must be >= 0');
  });

  it('returns valid false when wrong data type is provided for a property', () => {
    const data = { name: 123 }; // 'name' should be string
    const result = validateData(schema, data);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toBe('/name must be string');
  });

  it('handles cases where validate.errors is falsy', () => {
    (globalThis as any).mockErrorsNull = true;
    try {
      const result = validateData(schema, { age: -5 });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([]);
    } finally {
      (globalThis as any).mockErrorsNull = false;
    }
  });

  it('handles cases where error.message is missing', () => {
    (globalThis as any).mockErrorMessageNull = true;
    try {
      const result = validateData(schema, { age: -5 });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['/test is invalid']);
    } finally {
      (globalThis as any).mockErrorMessageNull = false;
    }
  });
});
