import { describe, expect, it } from 'vitest';
import {
  serviceAgreementListItemSchema,
  ServiceAgreementListDto,
  serviceAgreementDetailSchema,
  ServiceAgreementDetailDto,
} from '../../../../../src/modules/service-agreements/dtos/service-agreements.dtos';

describe('service-agreements DTO schemas', () => {
  const validListItem = {
    id: 'consent-id-123',
    agreementDocumentId: 'doc-id-456',
    title: 'Terms of Service',
    consentedAt: '2026-07-31T20:36:06Z',
  };

  const validDetail = {
    id: 'consent-id-123',
    agreementDocumentId: 'doc-id-456',
    title: 'Terms of Service',
    description: 'Description of the terms',
    content: { blocks: [] },
    decision: 'approve',
    approveLabel: 'I approve',
    rejectLabel: 'I do not approve',
    consentedAt: '2026-07-31T20:36:06Z',
  };

  describe('serviceAgreementListItemSchema', () => {
    it('should validate a valid list item', () => {
      const result = serviceAgreementListItemSchema.safeParse(validListItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validListItem);
      }
    });

    it('should fail validation if required fields are missing', () => {
      const result = serviceAgreementListItemSchema.safeParse({
        id: 'consent-id-123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ServiceAgreementListDto', () => {
    it('should validate a valid list DTO', () => {
      const listData = {
        items: [validListItem],
      };
      const result = ServiceAgreementListDto.schema.safeParse(listData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(listData);
      }
    });

    it('should fail validation if items is missing or not an array', () => {
      expect(ServiceAgreementListDto.schema.safeParse({}).success).toBe(false);
      expect(ServiceAgreementListDto.schema.safeParse({ items: 'not-an-array' }).success).toBe(
        false,
      );
    });
  });

  describe('serviceAgreementDetailSchema', () => {
    it('should validate a valid detail item with non-null description', () => {
      const result = serviceAgreementDetailSchema.safeParse(validDetail);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validDetail);
      }
    });

    it('should allow nullable description', () => {
      const result = serviceAgreementDetailSchema.safeParse({
        ...validDetail,
        description: null,
      });
      expect(result.success).toBe(true);
    });

    it('should fail validation if required fields are missing', () => {
      const result = serviceAgreementDetailSchema.safeParse({
        id: 'consent-id-123',
      });
      expect(result.success).toBe(false);
    });

    it('should fail validation for invalid decisions', () => {
      const result = serviceAgreementDetailSchema.safeParse({
        ...validDetail,
        decision: 'invalid-decision',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ServiceAgreementDetailDto', () => {
    it('should validate a valid detail DTO', () => {
      const result = ServiceAgreementDetailDto.schema.safeParse(validDetail);
      expect(result.success).toBe(true);
    });
  });
});
