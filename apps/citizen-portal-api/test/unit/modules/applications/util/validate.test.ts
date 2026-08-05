import { describe, expect, it, vi } from 'vitest';
import Ajv from 'ajv';
import {
  collectDecimalConstraints,
  validateDecimals,
  validateSubmission,
} from '../../../../../src/modules/applications/util/validate';

const basic = {
  schema: {
    type: 'object',
    required: ['name'],
    properties: { name: { type: 'string' }, age: { type: 'integer' } },
  },
};

const multiStage = {
  stages: [
    {
      pages: [
        { schema: { type: 'object', required: ['a'], properties: { a: { type: 'string' } } } },
      ],
    },
    { pages: [{ schema: { type: 'object', properties: { b: { type: 'boolean' } } } }] },
  ],
};

const mockValidate = () => false;

describe('validate utils', () => {
  describe('validateSubmission - basic form', () => {
    it('should pass valid basic-form data', () => {
      expect(validateSubmission('basic-form', basic, { name: 'Ann', age: 3 }).valid).toBe(true);
    });

    it('should fail on a missing required field', () => {
      const result = validateSubmission('basic-form', basic, { age: 3 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail on a wrong type', () => {
      expect(validateSubmission('basic-form', basic, { name: 123 }).valid).toBe(false);
    });

    it('should validate successfully when data matches schema', () => {
      const structure = {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer', minimum: 18 },
          },
          required: ['name'],
        },
      };

      const validData = { name: 'Alice', age: 25 };
      const result = validateSubmission('basic-form', structure, validData);

      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('should fail validation and return formatted errors when data is invalid', () => {
      const structure = {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer', minimum: 18 },
          },
          required: ['name'],
        },
      };

      const invalidData = { age: 15 }; // missing name, age < 18
      const result = validateSubmission('basic-form', structure, invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("(root) must have required property 'name'");
      expect(result.errors).toContain('/age must be >= 18');
    });

    it('should default to empty schema if schema is missing', () => {
      const structure = {};
      const result = validateSubmission('basic-form', structure, { anyData: 'value' });

      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });
  });

  describe('validateSubmission - multi-stage form', () => {
    it('should validate every page of a multi-stage form', () => {
      expect(validateSubmission('multi-stage-form', multiStage, { a: 'x', b: true }).valid).toBe(
        true,
      );
      // page 1 requires `a`; page 2's `b` must be boolean.
      expect(validateSubmission('multi-stage-form', multiStage, { b: 'nope' }).valid).toBe(false);
    });

    it('should validate successfully when data matches all pages schemas', () => {
      const structure = {
        stages: [
          {
            pages: [
              {
                schema: {
                  type: 'object',
                  properties: { name: { type: 'string' } },
                  required: ['name'],
                },
              },
            ],
          },
          {
            pages: [
              {
                schema: {
                  type: 'object',
                  properties: { email: { type: 'string', format: 'email' } },
                  required: ['email'],
                },
              },
            ],
          },
        ],
      };

      const validData = { name: 'Alice', email: 'alice@example.com' };
      const result = validateSubmission('multi-stage-form', structure, validData);

      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('should collect errors from multiple stages/pages when data is invalid', () => {
      const structure = {
        stages: [
          {
            pages: [
              {
                schema: {
                  type: 'object',
                  properties: { name: { type: 'string' } },
                  required: ['name'],
                },
              },
            ],
          },
          {
            pages: [
              {
                schema: {
                  type: 'object',
                  properties: { email: { type: 'string', format: 'email' } },
                  required: ['email'],
                },
              },
            ],
          },
        ],
      };

      const invalidData = { name: 123, email: 'invalid-email' };
      const result = validateSubmission('multi-stage-form', structure, invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('/name must be string');
      expect(result.errors).toContain('/email must match format "email"');
    });

    it('should handle missing stages or pages safely without throwing', () => {
      const structureEmptyStages = { stages: [] };
      const resultEmptyStages = validateSubmission('multi-stage-form', structureEmptyStages, {});
      expect(resultEmptyStages).toEqual({ valid: true, errors: [] });

      const structureMissingPages = { stages: [{}] };
      const resultMissingPages = validateSubmission('multi-stage-form', structureMissingPages, {});
      expect(resultMissingPages).toEqual({ valid: true, errors: [] });

      const structureEmptyPages = { stages: [{ pages: [{}] }] };
      const resultEmptyPages = validateSubmission('multi-stage-form', structureEmptyPages, {});
      expect(resultEmptyPages).toEqual({ valid: true, errors: [] });

      const structureUndefinedStages = {};
      const resultUndefinedStages = validateSubmission(
        'multi-stage-form',
        structureUndefinedStages,
        {},
      );
      expect(resultUndefinedStages).toEqual({ valid: true, errors: [] });
    });

    it('should handle undefined validate.errors and undefined error.message gracefully', () => {
      const compileSpy = vi.spyOn(Ajv.prototype, 'compile').mockImplementation(() => {
        const validate = mockValidate as any;
        validate.errors = [
          {
            instancePath: '/test',
            message: undefined,
          },
        ];
        return validate;
      });

      const result = validateSubmission('basic-form', { schema: {} }, {});
      expect(result).toEqual({
        valid: false,
        errors: ['/test is invalid'],
      });

      compileSpy.mockRestore();
    });

    it('should handle missing validate.errors list gracefully', () => {
      const compileSpy = vi.spyOn(Ajv.prototype, 'compile').mockImplementation(() => {
        const validate = mockValidate as any;
        validate.errors = undefined;
        return validate;
      });

      const result = validateSubmission('basic-form', { schema: {} }, {});
      expect(result).toEqual({
        valid: true,
        errors: [],
      });

      compileSpy.mockRestore();
    });
  });

  describe('decimal-places constraints (feature 155)', () => {
    const basicForm = {
      uischema: {
        type: 'VerticalLayout',
        elements: [
          { type: 'Control', scope: '#/properties/price', options: { decimals: 2 } },
          { type: 'Control', scope: '#/properties/note' },
          {
            type: 'Group',
            elements: [{ type: 'Control', scope: '#/properties/rate', options: { decimals: 3 } }],
          },
        ],
      },
    };

    const multiStageForm = {
      stages: [
        {
          pages: [
            {
              uischema: {
                type: 'VerticalLayout',
                elements: [
                  { type: 'Control', scope: '#/properties/amount', options: { decimals: 1 } },
                ],
              },
            },
          ],
        },
      ],
    };

    it('collects decimal constraints from a basic form (including nested)', () => {
      const constraints = collectDecimalConstraints('basic-form', basicForm);
      expect(constraints).toEqual(
        expect.arrayContaining([
          { key: 'price', maxDecimals: 2 },
          { key: 'rate', maxDecimals: 3 },
        ]),
      );
      expect(constraints).toHaveLength(2);
    });

    it('collects decimal constraints across multi-stage pages', () => {
      expect(collectDecimalConstraints('multi-stage-form', multiStageForm)).toEqual([
        { key: 'amount', maxDecimals: 1 },
      ]);
    });

    it('flags a value with too many decimal places', () => {
      const errors = validateDecimals([{ key: 'price', maxDecimals: 2 }], { price: 1.234 });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/price/);
    });

    it('accepts a value within the decimal limit', () => {
      expect(validateDecimals([{ key: 'price', maxDecimals: 2 }], { price: 1.2 })).toEqual([]);
      expect(validateDecimals([{ key: 'price', maxDecimals: 2 }], { price: 5 })).toEqual([]);
    });

    it('ignores absent or non-numeric values', () => {
      expect(validateDecimals([{ key: 'price', maxDecimals: 2 }], {})).toEqual([]);
      expect(validateDecimals([{ key: 'price', maxDecimals: 2 }], { price: 'x' })).toEqual([]);
    });
  });
});
