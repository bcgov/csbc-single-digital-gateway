import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { type Database, serviceAgreementConsents } from '@repo/database';
import { ServiceAgreementsService } from '../../../../../src/modules/service-agreements/services/service-agreements.service';

const createDbMock = () => {
  const mocks: {
    queries: Array<{
      table?: any;
      action?: 'select' | 'insert' | 'update' | undefined;
      resolve: any;
    }>;
  } = {
    queries: [],
  };

  const createBuilder = () => {
    let activeTable: any = null;
    let action: 'select' | 'insert' | 'update' = 'select';

    const builder = {
      select: vi.fn().mockImplementation(() => {
        action = 'select';
        return builder;
      }),
      from: vi.fn().mockImplementation((table) => {
        activeTable = table;
        return builder;
      }),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      // eslint-disable-next-line unicorn/no-thenable
      then: (onfulfilled: any) => {
        const index = mocks.queries.findIndex(
          (q) =>
            (q.table === undefined || q.table === activeTable) &&
            (q.action === undefined || q.action === action),
        );
        let result: any = [];
        if (index !== -1) {
          const entry = mocks.queries[index];
          if (entry !== undefined) {
            result = entry.resolve;
            mocks.queries.splice(index, 1);
          }
        }
        return Promise.resolve(result).then(onfulfilled);
      },
    };
    return builder;
  };

  const dbMock = {
    ...createBuilder(),
  };

  const mockResponse = (resolve: any, table?: any, action?: 'select' | 'insert' | 'update') => {
    mocks.queries.push({ table, action, resolve });
  };

  return { dbMock, mockResponse };
};

describe('ServiceAgreementsService Unit Test Suite', () => {
  let service: ServiceAgreementsService;
  let dbMock: any;
  let mockResponse: any;

  beforeEach(() => {
    const mocks = createDbMock();
    dbMock = mocks.dbMock;
    mockResponse = mocks.mockResponse;
    service = new ServiceAgreementsService(dbMock as unknown as Database);
  });

  describe('listMine', () => {
    it('should retrieve list of approved agreements newest first and map correctly', async () => {
      const createdAt = new Date('2026-07-31T20:00:00Z');
      const mockRows = [
        // Feature 217: the title is the CONSENTED version's GENERATED column, not a value read
        // out of its `data` blob. A NULL means its content carried no root label.
        {
          id: 'consent-id-1',
          agreementDocumentId: 'doc-id-1',
          title: 'First Agreement',
          createdAt,
        },
        {
          id: 'consent-id-2',
          agreementDocumentId: 'doc-id-2',
          title: '', // an empty generated title still falls back
          createdAt,
        },
        {
          id: 'consent-id-3',
          agreementDocumentId: 'doc-id-3',
          title: null,
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

    it('should throw BadRequestException if consentId is not a valid UUID', async () => {
      await expect(service.getMine('user-123', 'invalid-uuid')).rejects.toThrow(
        new BadRequestException('Invalid service agreement id'),
      );
    });

    it('should throw NotFoundException if query returns no rows', async () => {
      mockResponse([], serviceAgreementConsents, 'select');

      await expect(service.getMine('user-123', consentId)).rejects.toThrow(
        new NotFoundException('Service agreement not found'),
      );
    });

    it('should return service agreement detail when found', async () => {
      const createdAt = new Date('2026-07-31T20:00:00Z');
      const mockRow = {
        id: consentId,
        agreementDocumentId: 'doc-id-1',
        decision: 'approve',
        // Feature 217: title/description are GENERATED columns; the approve/reject labels are
        // AUTHORED options on the content's root element; `content` is the whole document.
        title: 'Agreement Detail Title',
        description: 'A detailed description',
        content: {
          schema: { type: 'object', properties: {} },
          uischema: {
            type: 'Form',
            elements: [],
            options: { approveLabel: 'Custom Approve', rejectLabel: 'Custom Reject' },
          },
        },
        createdAt,
      };

      mockResponse([mockRow], serviceAgreementConsents, 'select');

      const result = await service.getMine('user-123', consentId);

      expect(result).toEqual({
        id: consentId,
        agreementDocumentId: 'doc-id-1',
        title: 'Agreement Detail Title',
        description: 'A detailed description',
        content: {
          schema: { type: 'object', properties: {} },
          uischema: {
            type: 'Form',
            elements: [],
            options: { approveLabel: 'Custom Approve', rejectLabel: 'Custom Reject' },
          },
        },
        decision: 'approve',
        approveLabel: 'Custom Approve',
        rejectLabel: 'Custom Reject',
        consentedAt: createdAt.toISOString(),
      });
    });

    it('falls back to a default title and labels when the content authors none', async () => {
      const createdAt = new Date('2026-07-31T20:00:00Z');
      const mockRow = {
        id: consentId,
        agreementDocumentId: 'doc-id-1',
        decision: 'reject',
        title: null, // no root label → NULL generated title
        description: '', // an empty generated description falls back to null
        content: { schema: {}, uischema: { type: 'Form', elements: [] } },
        createdAt,
      };

      mockResponse([mockRow], serviceAgreementConsents, 'select');

      const result = await service.getMine('user-123', consentId);

      expect(result).toEqual({
        id: consentId,
        agreementDocumentId: 'doc-id-1',
        title: 'Service agreement', // Fallback title
        description: null, // Fallback description
        content: { schema: {}, uischema: { type: 'Form', elements: [] } },
        decision: 'reject',
        approveLabel: 'I approve', // Fallback label
        rejectLabel: 'I do not approve', // Fallback label
        consentedAt: createdAt.toISOString(),
      });
    });
  });
});
