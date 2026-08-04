import { describe, expect, it } from 'vitest';
import {
  attachAgreementSchema,
  agreementRefSchema,
} from '../../../../../src/modules/services/dtos/agreement-ref.dtos';
import {
  createServiceAgreementSchema,
  listServiceAgreementsSchema,
  toAgreementDto,
  toAgreementVersionDto,
  updateServiceAgreementSchema,
} from '../../../../../src/modules/service-agreements/dtos/service-agreement.dtos';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('Service Agreements DTOs Unit Test Suite', () => {
  describe('service agreement DTO schemas', () => {
    it('create: workspaceId is optional (global) but must be a uuid when present; data required', () => {
      expect(createServiceAgreementSchema.safeParse({ data: {} }).success).toBe(true);
      expect(createServiceAgreementSchema.safeParse({ workspaceId: UUID, data: {} }).success).toBe(
        true,
      );
      expect(createServiceAgreementSchema.safeParse({}).success).toBe(false);
      expect(
        createServiceAgreementSchema.safeParse({ workspaceId: 'nope', data: {} }).success,
      ).toBe(false);
    });

    it('update: data required, title optional (trimmed, non-empty)', () => {
      expect(updateServiceAgreementSchema.safeParse({ data: {} }).success).toBe(true);
      expect(updateServiceAgreementSchema.safeParse({ data: {}, title: 'Terms' }).success).toBe(
        true,
      );
      expect(updateServiceAgreementSchema.safeParse({}).success).toBe(false);
      expect(updateServiceAgreementSchema.safeParse({ data: {}, title: '' }).success).toBe(false);
    });

    it('list: workspaceId optional, must be a uuid when present', () => {
      expect(listServiceAgreementsSchema.safeParse({}).success).toBe(true);
      expect(listServiceAgreementsSchema.safeParse({ workspaceId: UUID }).success).toBe(true);
      expect(listServiceAgreementsSchema.safeParse({ workspaceId: 'nope' }).success).toBe(false);
    });
  });

  describe('service agreement mappers', () => {
    it('toAgreementDto surfaces a null workspaceId for a global agreement', () => {
      const created = new Date('2026-07-07T00:00:00.000Z');
      const global = toAgreementDto({
        id: 'a1',
        workspaceId: null,
        title: 'Global ToS',
        kind: 'service-agreement',
        createdAt: created,
        updatedAt: new Date(),
      } as unknown as Parameters<typeof toAgreementDto>[0]);
      expect(global.workspaceId).toBeNull();
      expect(global.title).toBe('Global ToS');
      expect(global.createdAt).toBe('2026-07-07T00:00:00.000Z');
    });

    it('toAgreementVersionDto maps status + nullable timestamps', () => {
      const created = new Date('2026-07-07T00:00:00.000Z');
      const dto = toAgreementVersionDto({
        id: 'v1',
        version: 2,
        status: 'draft',
        data: { title: 'x' },
        createdAt: created,
        publishedAt: null,
        archivedAt: null,
      } as unknown as Parameters<typeof toAgreementVersionDto>[0]);
      expect(dto.version).toBe(2);
      expect(dto.status).toBe('draft');
      expect(dto.publishedAt).toBeNull();
      expect(dto.data).toEqual({ title: 'x' });
    });
  });

  describe('agreement reference DTO schemas', () => {
    it('attach requires a uuid agreementDocumentId', () => {
      expect(attachAgreementSchema.safeParse({ agreementDocumentId: UUID }).success).toBe(true);
      expect(attachAgreementSchema.safeParse({}).success).toBe(false);
      expect(attachAgreementSchema.safeParse({ agreementDocumentId: 'nope' }).success).toBe(false);
    });

    it('the response schema round-trips a resolved reference', () => {
      const parsed = agreementRefSchema.safeParse({
        id: 'ref1',
        agreementDocumentId: 'a1',
        agreementVersionId: 'v1',
        title: 'Terms of service',
        isOptional: false,
        isGlobal: true,
        position: 0,
        createdAt: '2026-07-08T00:00:00.000Z',
      });
      expect(parsed.success).toBe(true);
    });
  });
});
