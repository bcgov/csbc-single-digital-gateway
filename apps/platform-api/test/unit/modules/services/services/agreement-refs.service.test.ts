import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AgreementRefsService } from '../../../../../src/modules/services/services/agreement-refs.service';
import { createMockQuery } from '../../../../utils/create-mock-query';
import { mockCreatedAt } from '../../../../utils/fixtures';
import { createMockDb } from '../../../../utils/create-db-mock';
import { createMockService } from '../../../../utils/create-mock-services';

describe('AgreementRefsService', () => {
  let service: AgreementRefsService;
  let dbMock: any;
  let servicesServiceMock: any;
  let txMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const mocks = createMockDb();
    dbMock = mocks.dbMock;
    txMock = mocks.txMock;

    servicesServiceMock = createMockService();
    service = new AgreementRefsService(dbMock, servicesServiceMock);
  });

  describe('attach', () => {
    it('Should throw BadRequestException if the agreement is from a different workspace', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ status: 'draft' }])) // requireDraftOwner
        .mockImplementationOnce(() =>
          createMockQuery([
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

    it('Should throw ConflictException if already attached', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ status: 'draft' }])) // requireDraftOwner
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              documentId: 'doc-agreement-1',
              title: 'Agreement 1',
              workspaceId: 'ws-1',
              versionId: 'ver-agreement-1',
              data: { isOptional: false },
            },
          ]),
        ) // resolvePublishedAgreement
        .mockImplementationOnce(() => createMockQuery([{ id: 'ref-1' }])); // already attached check

      await expect(service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('Should throw UnprocessableEntityException if the agreement is not found or published', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ status: 'draft' }])) // requireDraftOwner
        .mockImplementationOnce(() => createMockQuery([])); // resolvePublishedAgreement resolves to empty

      await expect(service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1')).rejects.toThrow(
        'Not a published service agreement (publish the agreement before attaching it)',
      );
    });

    it('Should throw NotFoundException if the service version is not found', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => createMockQuery([])); // requireDraftOwner version not found

      await expect(service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Should throw ConflictException if the service version is not draft', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => createMockQuery([{ status: 'published' }])); // requireDraftOwner is not draft

      await expect(service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('Should throw Error if agreement reference insert returned no row', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ status: 'draft' }])) // requireDraftOwner
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              documentId: 'doc-agreement-1',
              title: 'Agreement 1',
              workspaceId: 'ws-1',
              versionId: 'ver-agreement-1',
              data: { isOptional: true },
            },
          ]),
        ) // resolvePublishedAgreement
        .mockImplementationOnce(() => createMockQuery([])) // already attached check (none)
        .mockImplementationOnce(() => createMockQuery([{ max: 0 }])); // nextPosition

      dbMock.returning.mockResolvedValueOnce([]); // empty insertion row array

      await expect(service.attach('user-1', 'srv-1', 'ver-1', 'doc-agreement-1')).rejects.toThrow(
        'agreement reference insert returned no row',
      );
    });

    it('Should attach agreement successfully if valid', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ status: 'draft' }])) // requireDraftOwner
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              documentId: 'doc-agreement-1',
              title: 'Agreement 1',
              workspaceId: 'ws-1',
              versionId: 'ver-agreement-1',
              data: { isOptional: true },
            },
          ]),
        ) // resolvePublishedAgreement
        .mockImplementationOnce(() => createMockQuery([])) // already attached check (none)
        .mockImplementationOnce(() => createMockQuery([{ max: 0 }])); // nextPosition (max position is 0)

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
    it('Should throw NotFoundException if reference does not exist', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => createMockQuery([{ status: 'draft' }])); // requireDraftOwner
      txMock.returning.mockResolvedValueOnce([]); // no reference row deleted

      await expect(service.detach('user-1', 'srv-1', 'ver-1', 'ref-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Should detach agreement successfully', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => createMockQuery([{ status: 'draft' }])); // requireDraftOwner
      txMock.returning.mockResolvedValueOnce([{ agreementId: 'doc-agreement-1' }]); // reference deleted
      txMock.select
        .mockImplementationOnce(() => createMockQuery([{ n: 0 }])) // remaining count
        .mockImplementationOnce(() => createMockQuery([])); // published count (none -> orphaned draft deleted)

      await expect(service.detach('user-1', 'srv-1', 'ver-1', 'ref-1')).resolves.not.toThrow();
    });

    it('Should detach agreement but does not delete if remaining references exist', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => createMockQuery([{ status: 'draft' }]));
      txMock.returning.mockResolvedValueOnce([{ agreementId: 'doc-agreement-1' }]);
      txMock.select
        .mockImplementationOnce(() => createMockQuery([{ n: 1 }])) // remaining count > 0
        .mockImplementationOnce(() => createMockQuery([]));

      await expect(service.detach('user-1', 'srv-1', 'ver-1', 'ref-1')).resolves.not.toThrow();
      expect(txMock.delete).toHaveBeenCalledTimes(1);
    });

    it('Should detach agreement but does not delete if agreement is published', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => createMockQuery([{ status: 'draft' }]));
      txMock.returning.mockResolvedValueOnce([{ agreementId: 'doc-agreement-1' }]);
      txMock.select
        .mockImplementationOnce(() => createMockQuery([{ n: 0 }]))
        .mockImplementationOnce(() => createMockQuery([{ id: 'ver-published-1' }])); // published exists

      await expect(service.detach('user-1', 'srv-1', 'ver-1', 'ref-1')).resolves.not.toThrow();
      expect(txMock.delete).toHaveBeenCalledTimes(1);
    });

    it('Should detach agreement successfully when remaining count returns empty rows array', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() => createMockQuery([{ status: 'draft' }]));
      txMock.returning.mockResolvedValueOnce([{ agreementId: 'doc-agreement-1' }]);
      txMock.select
        .mockImplementationOnce(() => createMockQuery([])) // remaining count returns empty array
        .mockImplementationOnce(() => createMockQuery([])); // published count (none -> orphaned draft deleted)

      await expect(service.detach('user-1', 'srv-1', 'ver-1', 'ref-1')).resolves.not.toThrow();
      expect(txMock.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('list', () => {
    it('Should return empty list if no agreement references are attached', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });
      dbMock.select.mockImplementationOnce(() => createMockQuery([]));

      const result = await service.list('user-1', 'srv-1', 'ver-1');
      expect(result).toEqual([]);
    });

    it('Should return mapped agreement references list', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select.mockImplementationOnce(() =>
        createMockQuery([
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
    it('Should use fallback position 0 if max returned is null or rows undefined', async () => {
      servicesServiceMock.requireDocument.mockResolvedValue({ workspaceId: 'ws-1' });

      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ status: 'draft' }])) // requireDraftOwner
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              documentId: 'doc-agreement-1',
              title: 'Agreement 1',
              workspaceId: 'ws-1',
              versionId: 'ver-agreement-1',
              data: { isOptional: true },
            },
          ]),
        ) // resolvePublishedAgreement
        .mockImplementationOnce(() => createMockQuery([])) // already attached check (none)
        .mockImplementationOnce(() => createMockQuery([undefined])); // nextPosition returns rows[0] as undefined (or no max)

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
