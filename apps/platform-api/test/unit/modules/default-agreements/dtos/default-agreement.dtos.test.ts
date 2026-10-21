import { describe, expect, it } from 'vitest';
import {
  addDefaultAgreementSchema,
  defaultAgreementSchema,
} from '../../../../../src/modules/default-agreements/dtos/default-agreement.dtos';

const VALID_UUID = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';

describe('default-agreement DTO schemas', () => {
  describe('addDefaultAgreementSchema', () => {
    it('Should accept a valid UUID for agreementDocumentId', () => {
      const payload = { agreementDocumentId: VALID_UUID };
      const parsed = addDefaultAgreementSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });

    it('Should reject an invalid UUID for agreementDocumentId', () => {
      const payload = { agreementDocumentId: 'not-a-uuid' };
      const result = addDefaultAgreementSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('Should reject a missing agreementDocumentId', () => {
      const payload = {};
      const result = addDefaultAgreementSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('defaultAgreementSchema', () => {
    it('Should accept a valid default agreement payload', () => {
      const payload = {
        id: 'some-id',
        agreementDocumentId: VALID_UUID,
        title: 'Service Level Agreement',
        isOptional: false,
        isGlobal: true,
        createdAt: '2026-07-28T09:45:00.000Z',
      };
      const parsed = defaultAgreementSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });

    it('Should reject payload missing required fields', () => {
      const payload = {
        id: 'some-id',
        agreementDocumentId: VALID_UUID,
      };
      const result = defaultAgreementSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('Should reject incorrect types', () => {
      const payload = {
        id: 'some-id',
        agreementDocumentId: VALID_UUID,
        title: 'Service Level Agreement',
        isOptional: 'false', // string instead of boolean
        isGlobal: true,
        createdAt: '2026-07-28T09:45:00.000Z',
      };
      const result = defaultAgreementSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
