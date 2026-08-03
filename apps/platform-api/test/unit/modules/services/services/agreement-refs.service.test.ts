import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AgreementRefsService } from '../../../../../src/modules/services/services/agreement-refs.service';

const mockQuery = (resolvedValue: any) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  });
};

describe('AgreementRefsService', () => {
  let service: AgreementRefsService;
  let dbMock: any;
  let servicesServiceMock: any;
  let txMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    txMock = {
      select: vi.fn().mockImplementation(() => mockQuery([])),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    };

    dbMock = {
      select: vi.fn().mockImplementation(() => mockQuery([])),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      transaction: vi.fn().mockImplementation(async (cb) => cb(txMock)),
    };

    servicesServiceMock = {
      requireDocument: vi.fn(),
    };

    service = new AgreementRefsService(dbMock, servicesServiceMock);
  });

  describe('attach', () => {
    it('throws BadRequestException if the agreement is from a different workspace', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select
        .mockImplementationOnce(() => mockQuery([{ status: 'draft' }])) // requireDraftOwner
        .mockImplementationOnce(() =>
          mockQuery([
            {
              documentId: 'doc-agreement-1',
              title: 'Agreement 1',
              workspaceId: 'other-ws',
              versionId: 'ver-agreement-1',
              data: { isOptional: false },
            },
          ]),
        ); // resolvePublishedAgreement

      await expect(service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException if already attached', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select
        .mockImplementationOnce(() => mockQuery([{ status: 'draft' }])) // requireDraftOwner
        .mockImplementationOnce(() =>
          mockQuery([
            {
              documentId: 'doc-agreement-1',
              title: 'Agreement 1',
              workspaceId: 'ws-1',
              versionId: 'ver-agreement-1',
              data: { isOptional: false },
            },
          ]),
        ) // resolvePublishedAgreement
        .mockImplementationOnce(() => mockQuery([{ id: 'ref-1' }])); // already attached check

      await expect(service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws UnprocessableEntityException if the agreement is not found or published', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select
        .mockImplementationOnce(() => mockQuery([{ status: 'draft' }])) // requireDraftOwner
        .mockImplementationOnce(() => mockQuery([])); // resolvePublishedAgreement resolves to empty

      await expect(service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1')).rejects.toThrow(
        'Not a published service agreement (publish the agreement before attaching it)',
      );
    });

    it('throws NotFoundException if the service version is not found', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => mockQuery([])); // requireDraftOwner version not found

      await expect(service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException if the service version is not draft', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => mockQuery([{ status: 'published' }])); // requireDraftOwner is not draft

      await expect(service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws Error if agreement reference insert returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select
        .mockImplementationOnce(() => mockQuery([{ status: 'draft' }])) // requireDraftOwner
        .mockImplementationOnce(() =>
          mockQuery([
            {
              documentId: 'doc-agreement-1',
              title: 'Agreement 1',
              workspaceId: 'ws-1',
              versionId: 'ver-agreement-1',
              data: { isOptional: true },
            },
          ]),
        ) // resolvePublishedAgreement
        .mockImplementationOnce(() => mockQuery([])) // already attached check (none)
        .mockImplementationOnce(() => mockQuery([{ max: 0 }])); // nextPosition

      dbMock.returning.mockResolvedValueOnce([]); // empty insertion row array

      await expect(service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1')).rejects.toThrow(
        'agreement reference insert returned no row',
      );
    });

    it('attaches agreement successfully if valid', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });
      const mockCreatedAt = new Date('2026-07-28T12:00:00.000Z');

      dbMock.select
        .mockImplementationOnce(() => mockQuery([{ status: 'draft' }])) // requireDraftOwner
        .mockImplementationOnce(() =>
          mockQuery([
            {
              documentId: 'doc-agreement-1',
              title: 'Agreement 1',
              workspaceId: 'ws-1',
              versionId: 'ver-agreement-1',
              data: { isOptional: true },
            },
          ]),
        ) // resolvePublishedAgreement
        .mockImplementationOnce(() => mockQuery([])) // already attached check (none)
        .mockImplementationOnce(() => mockQuery([{ max: 0 }])); // nextPosition (max position is 0)

      dbMock.returning.mockResolvedValueOnce([
        {
          id: 'ref-1',
          position: 1,
          createdAt: mockCreatedAt,
        },
      ]);

      const result = await service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1');

      expect(result).toEqual({
        id: 'ref-1',
        agreementDocumentId: 'doc-agreement-1',
        title: 'Agreement 1',
        isOptional: true,
        isGlobal: false,
        position: 1,
        createdAt: mockCreatedAt.toISOString(),
      });
    });
  });

  describe('detach', () => {
    it('throws NotFoundException if reference does not exist', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => mockQuery([{ status: 'draft' }])); // requireDraftOwner
      txMock.returning.mockResolvedValueOnce([]); // no reference row deleted

      await expect(service.detach('user-1', 'srv-1', 'ver-1', 'ref-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('detaches agreement successfully', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => mockQuery([{ status: 'draft' }])); // requireDraftOwner
      txMock.returning.mockResolvedValueOnce([{ agreementId: 'doc-agreement-1' }]); // reference deleted
      txMock.select
        .mockImplementationOnce(() => mockQuery([{ n: 0 }])) // remaining count
        .mockImplementationOnce(() => mockQuery([])); // published count (none -> orphaned draft deleted)

      await expect(service.detach('user-1', 'srv-1', 'ver-1', 'ref-1')).resolves.not.toThrow();
    });

    it('detaches agreement but does not delete if remaining references exist', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => mockQuery([{ status: 'draft' }]));
      txMock.returning.mockResolvedValueOnce([{ agreementId: 'doc-agreement-1' }]);
      txMock.select
        .mockImplementationOnce(() => mockQuery([{ n: 1 }])) // remaining count > 0
        .mockImplementationOnce(() => mockQuery([]));

      await expect(service.detach('user-1', 'srv-1', 'ver-1', 'ref-1')).resolves.not.toThrow();
      expect(txMock.delete).toHaveBeenCalledTimes(1);
    });

    it('detaches agreement but does not delete if agreement is published', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => mockQuery([{ status: 'draft' }]));
      txMock.returning.mockResolvedValueOnce([{ agreementId: 'doc-agreement-1' }]);
      txMock.select
        .mockImplementationOnce(() => mockQuery([{ n: 0 }]))
        .mockImplementationOnce(() => mockQuery([{ id: 'ver-published-1' }])); // published exists

      await expect(service.detach('user-1', 'srv-1', 'ver-1', 'ref-1')).resolves.not.toThrow();
      expect(txMock.delete).toHaveBeenCalledTimes(1);
    });

    it('detaches agreement successfully when remaining count returns empty rows array', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => mockQuery([{ status: 'draft' }]));
      txMock.returning.mockResolvedValueOnce([{ agreementId: 'doc-agreement-1' }]);
      txMock.select
        .mockImplementationOnce(() => mockQuery([])) // remaining count returns empty array
        .mockImplementationOnce(() => mockQuery([])); // published count (none -> orphaned draft deleted)

      await expect(service.detach('user-1', 'srv-1', 'ver-1', 'ref-1')).resolves.not.toThrow();
      expect(txMock.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('list', () => {
    it('returns empty list if no agreement references are attached', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });
      dbMock.select.mockImplementationOnce(() => mockQuery([]));

      const result = await service.list('user-1', 'srv-1', 'ver-1');
      expect(result).toEqual([]);
    });

    it('returns mapped agreement references list', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });
      const mockCreatedAt = new Date('2026-07-28T12:00:00.000Z');

      dbMock.select.mockImplementationOnce(() =>
        mockQuery([
          {
            id: 'ref-1',
            agreementDocumentId: 'doc-agreement-1',
            title: 'Agreement 1',
            data: { isOptional: true },
            targetWorkspaceId: null,
            position: 0,
            createdAt: mockCreatedAt,
          },
        ]),
      );

      const result = await service.list('user-1', 'srv-1', 'ver-1');

      expect(result).toEqual([
        {
          id: 'ref-1',
          agreementDocumentId: 'doc-agreement-1',
          title: 'Agreement 1',
          isOptional: true,
          isGlobal: true,
          position: 0,
          createdAt: mockCreatedAt.toISOString(),
        },
      ]);
    });
  });

  describe('nextPosition boundary', () => {
    it('uses fallback position 0 if max returned is null or rows undefined', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });
      const mockCreatedAt = new Date('2026-07-28T12:00:00.000Z');

      dbMock.select
        .mockImplementationOnce(() => mockQuery([{ status: 'draft' }])) // requireDraftOwner
        .mockImplementationOnce(() =>
          mockQuery([
            {
              documentId: 'doc-agreement-1',
              title: 'Agreement 1',
              workspaceId: 'ws-1',
              versionId: 'ver-agreement-1',
              data: { isOptional: true },
            },
          ]),
        ) // resolvePublishedAgreement
        .mockImplementationOnce(() => mockQuery([])) // already attached check (none)
        .mockImplementationOnce(() => mockQuery([undefined])); // nextPosition returns rows[0] as undefined (or no max)

      dbMock.returning.mockResolvedValueOnce([
        {
          id: 'ref-1',
          position: 0,
          createdAt: mockCreatedAt,
        },
      ]);

      const result = await service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1');
      expect(result.position).toBe(0);
    });
  });
});
