import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DefaultAgreementsV1Controller } from '../../../../../src/modules/default-agreements/controllers/default-agreements-v1.controller';
import type { AuthUser } from '@repo/nestjs/auth';
import type { AddDefaultAgreementDto } from '../../../../../src/modules/default-agreements/dtos/default-agreement.dtos';

describe('DefaultAgreementsV1Controller', () => {
  let controller: DefaultAgreementsV1Controller;
  let serviceMock: any;

  const mockUser: AuthUser = {
    id: 'user-1',
    roles: ['staff'],
    claims: {
      sub: 'user-1-sub',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  beforeEach(() => {
    serviceMock = {
      list: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
    };

    controller = new DefaultAgreementsV1Controller(serviceMock);
  });

  describe('list', () => {
    it('returns default agreements list from the service wrapped in an items object', async () => {
      const mockList = [
        {
          id: 'def-1',
          agreementDocumentId: 'doc-1',
          title: 'Agreement 1',
          isOptional: false,
          isGlobal: true,
          createdAt: new Date().toISOString(),
        },
      ];
      serviceMock.list.mockResolvedValue(mockList);

      const result = await controller.list(mockUser, 'ws-1');

      expect(serviceMock.list).toHaveBeenCalledWith(mockUser.id, 'ws-1');
      expect(result).toEqual({ items: mockList });
    });
  });

  describe('add', () => {
    it('adds a default agreement via the service', async () => {
      const body: AddDefaultAgreementDto = {
        agreementDocumentId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
      };
      const mockResult = {
        id: 'def-1',
        agreementDocumentId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
        title: 'Agreement 1',
        isOptional: false,
        isGlobal: true,
        createdAt: new Date().toISOString(),
      };
      serviceMock.add.mockResolvedValue(mockResult);

      const result = await controller.add(mockUser, 'ws-1', body);

      expect(serviceMock.add).toHaveBeenCalledWith(mockUser.id, 'ws-1', body.agreementDocumentId);
      expect(result).toEqual(mockResult);
    });
  });

  describe('remove', () => {
    it('removes a default agreement via the service', async () => {
      serviceMock.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser, 'ws-1', 'def-1');

      expect(serviceMock.remove).toHaveBeenCalledWith(mockUser.id, 'ws-1', 'def-1');
    });
  });
});
