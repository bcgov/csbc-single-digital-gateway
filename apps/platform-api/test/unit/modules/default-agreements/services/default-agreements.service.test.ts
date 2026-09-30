import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DefaultAgreementsService } from '../../../../../src/modules/default-agreements/services/default-agreements.service';
import { createMockQuery } from '../../../../utils/create-mock-query';

describe('DefaultAgreementsService', () => {
  let service: DefaultAgreementsService;
  let dbMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    dbMock = {
      select: vi.fn().mockImplementation(() => createMockQuery([])),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    service = new DefaultAgreementsService(dbMock);
  });

  describe('list', () => {
    it('throws NotFoundException if caller is not a member of the workspace', async () => {
      dbMock.select.mockImplementationOnce(() => createMockQuery([])); // requireMember check

      await expect(service.list('user-1', 'ws-1')).rejects.toThrow(NotFoundException);
    });

    it('returns mapped default agreements if caller is a member', async () => {
      const mockCreatedAt = new Date('2026-07-28T00:00:00.000Z');
      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ role: 'member' }])) // requireMember check
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              id: 'def-1',
              agreementDocumentId: 'doc-1',
              agreementWorkspaceId: null,
              title: 'Global Agreement',
              data: { isOptional: true },
              createdAt: mockCreatedAt,
            },
          ]),
        );

      const result = await service.list('user-1', 'ws-1');

      expect(result).toEqual([
        {
          id: 'def-1',
          agreementDocumentId: 'doc-1',
          title: 'Global Agreement',
          isOptional: true,
          isGlobal: true,
          createdAt: mockCreatedAt.toISOString(),
        },
      ]);
    });
  });

  describe('add', () => {
    it('throws ForbiddenException if caller is not an admin when adding a default agreement', async () => {
      dbMock.select.mockImplementationOnce(() => createMockQuery([{ role: 'member' }])); // requireMember check (requireAdmin uses this)

      await expect(service.add('user-1', 'ws-1', 'doc-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws UnprocessableEntityException if the agreement is from a different workspace', async () => {
      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ role: 'admin' }])) // requireAdmin -> requireMember
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              workspaceId: 'other-ws',
              title: 'Other Agreement',
              data: { isOptional: false },
            },
          ]),
        ); // resolvePublishedAgreement

      await expect(service.add('user-1', 'ws-1', 'doc-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws ConflictException if the agreement is already a default for the workspace', async () => {
      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ role: 'admin' }])) // requireAdmin
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              workspaceId: 'ws-1',
              title: 'My Agreement',
              data: { isOptional: false },
            },
          ]),
        ) // resolvePublishedAgreement
        .mockImplementationOnce(() => createMockQuery([{ id: 'def-1' }])); // existing default check

      await expect(service.add('user-1', 'ws-1', 'doc-1')).rejects.toThrow(ConflictException);
    });

    it('throws UnprocessableEntityException if the agreement is not published', async () => {
      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ role: 'admin' }])) // requireAdmin
        .mockImplementationOnce(() => createMockQuery([])); // resolvePublishedAgreement returns empty

      await expect(service.add('user-1', 'ws-1', 'doc-1')).rejects.toThrow(
        new UnprocessableEntityException(
          'Not a published service agreement (publish it before making it a default)',
        ),
      );
    });

    it('throws Error if default agreement insert returned no row', async () => {
      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ role: 'admin' }])) // requireAdmin
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              workspaceId: 'ws-1',
              title: 'My Agreement',
              data: { isOptional: false },
            },
          ]),
        ) // resolvePublishedAgreement
        .mockImplementationOnce(() => createMockQuery([])); // existing default check (none)

      dbMock.returning.mockResolvedValueOnce([]); // empty insert returning

      await expect(service.add('user-1', 'ws-1', 'doc-1')).rejects.toThrow(
        new Error('default agreement insert returned no row'),
      );
    });

    it('adds and returns a default agreement successfully if all checks pass', async () => {
      const mockCreatedAt = new Date('2026-07-28T00:00:00.000Z');
      dbMock.select
        .mockImplementationOnce(() => createMockQuery([{ role: 'admin' }])) // requireAdmin
        .mockImplementationOnce(() =>
          createMockQuery([
            {
              workspaceId: 'ws-1',
              title: 'My Agreement',
              data: { isOptional: false },
            },
          ]),
        ) // resolvePublishedAgreement
        .mockImplementationOnce(() => createMockQuery([])); // existing default check (none)

      dbMock.returning.mockResolvedValueOnce([
        {
          id: 'def-1',
          createdAt: mockCreatedAt,
        },
      ]);

      const result = await service.add('user-1', 'ws-1', 'doc-1');

      expect(result).toEqual({
        id: 'def-1',
        agreementDocumentId: 'doc-1',
        title: 'My Agreement',
        isOptional: false,
        isGlobal: false,
        createdAt: mockCreatedAt.toISOString(),
      });
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException if caller is not an admin when removing a default agreement', async () => {
      dbMock.select.mockImplementationOnce(() => createMockQuery([{ role: 'member' }])); // requireMember check

      await expect(service.remove('user-1', 'ws-1', 'def-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if default agreement to delete does not exist', async () => {
      dbMock.select.mockImplementationOnce(() => createMockQuery([{ role: 'admin' }])); // requireAdmin
      dbMock.returning.mockResolvedValueOnce([]); // no rows deleted

      await expect(service.remove('user-1', 'ws-1', 'def-1')).rejects.toThrow(NotFoundException);
    });

    it('deletes default agreement successfully if admin and exists', async () => {
      dbMock.select.mockImplementationOnce(() => createMockQuery([{ role: 'admin' }])); // requireAdmin
      dbMock.returning.mockResolvedValueOnce([{ id: 'def-1' }]);

      await expect(service.remove('user-1', 'ws-1', 'def-1')).resolves.not.toThrow();
    });
  });
});
