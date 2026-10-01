import { beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { type Database, serviceAgreementConsents } from '@repo/database';
import { ServiceAgreementsService } from '../../../../../src/modules/service-agreements/services/service-agreements.service';
import { createMockDb } from '../../../../utils/create-mock-db';

describe('ServiceAgreementsService Unit Test Suite', () => {
  let service: ServiceAgreementsService;
  let dbMock: any;
  let mockResponse: any;

  beforeEach(() => {
    const mocks = createMockDb();
    dbMock = mocks.builderMock;
    mockResponse = mocks.mockResponse;
    service = new ServiceAgreementsService(dbMock as unknown as Database);
  });

  describe('listMine', () => {
    it('Should retrieve list of approved agreements newest first and map correctly', async () => {
      const createdAt = new Date('2026-07-31T20:00:00Z');
      const mockRows = [
        {
          id: 'consent-id-1',
          agreementDocumentId: 'doc-id-1',
          data: { title: 'First Agreement' },
          createdAt,
        },
        {
          id: 'consent-id-2',
          agreementDocumentId: 'doc-id-2',
          data: { title: '' }, // tests str empty string fallback
          createdAt,
        },
        {
          id: 'consent-id-3',
          agreementDocumentId: 'doc-id-3',
          data: null, // tests asData null fallback
          createdAt,
        },
      ];

      mockResponse(mockRows, serviceAgreementConsents, 'select');

      const result = await service.listMine('user-123');

      expect(result).toEqual([
        {
          id: 'consent-id-1',
          agreementDocumentId: 'doc-id-1',
          title: 'First Agreement',
          consentedAt: createdAt.toISOString(),
        },
        {
          id: 'consent-id-2',
          agreementDocumentId: 'doc-id-2',
          title: 'Service agreement', // Empty string fallback
          consentedAt: createdAt.toISOString(),
        },
        {
          id: 'consent-id-3',
          agreementDocumentId: 'doc-id-3',
          title: 'Service agreement', // Null fallback
          consentedAt: createdAt.toISOString(),
        },
      ]);
    });
  });

  describe('getMine', () => {
    const consentId = '11111111-1111-4111-8111-111111111111';

    it('Should throw BadRequestException if consentId is not a valid UUID', async () => {
      await expect(service.getMine('user-123', 'invalid-uuid')).rejects.toThrow(
        new BadRequestException('Invalid service agreement id'),
      );
    });

    it('Should throw NotFoundException if query returns no rows', async () => {
      mockResponse([], serviceAgreementConsents, 'select');

      await expect(service.getMine('user-123', consentId)).rejects.toThrow(
        new NotFoundException('Service agreement not found'),
      );
    });

    it('Should return service agreement detail when found', async () => {
      const createdAt = new Date('2026-07-31T20:00:00Z');
      const mockServiceAgreement = {
        id: consentId,
        agreementDocumentId: 'doc-id-1',
        decision: 'approve',
        data: {
          title: 'Agreement Detail Title',
          description: 'A detailed description',
          content: { type: 'doc', children: [] },
          approveLabel: 'Custom Approve',
          rejectLabel: 'Custom Reject',
        },
        createdAt,
      };

      mockResponse([mockServiceAgreement], serviceAgreementConsents, 'select');

      const result = await service.getMine('user-123', consentId);

      expect(result).toEqual({
        id: consentId,
        agreementDocumentId: 'doc-id-1',
        title: 'Agreement Detail Title',
        description: 'A detailed description',
        content: { type: 'doc', children: [] },
        decision: 'approve',
        approveLabel: 'Custom Approve',
        rejectLabel: 'Custom Reject',
        consentedAt: createdAt.toISOString(),
      });
    });

    it('Should fallback to null / default labels when fields in JSON data are missing or empty', async () => {
      const createdAt = new Date('2026-07-31T20:00:00Z');
      const mockUndefinedTitleServiceAgreement = {
        id: consentId,
        agreementDocumentId: 'doc-id-1',
        decision: 'reject',
        data: {
          title: undefined,
          description: '', // empty description should fallback to null
          content: undefined, // missing content should fallback to null
          approveLabel: '',
          rejectLabel: undefined,
        },
        createdAt,
      };

      mockResponse([mockUndefinedTitleServiceAgreement], serviceAgreementConsents, 'select');

      const result = await service.getMine('user-123', consentId);

      expect(result).toEqual({
        id: consentId,
        agreementDocumentId: 'doc-id-1',
        title: 'Service agreement', // Fallback title
        description: null, // Fallback description
        content: null, // Fallback content
        decision: 'reject',
        approveLabel: 'I approve', // Fallback label
        rejectLabel: 'I do not approve', // Fallback label
        consentedAt: createdAt.toISOString(),
      });
    });
  });
});
