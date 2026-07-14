import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServiceReferencesV1Controller } from '../../../../../src/modules/services/controllers/service-references-v1.controller';
import type { AuthUser } from '@repo/nestjs/auth';
import type {
  AddReferenceDto,
  CreateReferencedFormDto,
} from '../../../../../src/modules/services/dtos/reference.dtos';

describe('ServiceReferencesV1Controller', () => {
  let controller: ServiceReferencesV1Controller;
  let referencesServiceMock: any;

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
    referencesServiceMock = {
      list: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      archive: vi.fn(),
      createForm: vi.fn(),
    };

    controller = new ServiceReferencesV1Controller(referencesServiceMock);
  });

  describe('list', () => {
    it('returns references list from the service wrapped in an items object', async () => {
      const mockList = [{ id: 'ref-1', name: 'Ref 1' }];
      referencesServiceMock.list.mockResolvedValue(mockList);

      const result = await controller.list(mockUser, 'service-1', 'version-1');

      expect(referencesServiceMock.list).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
      );
      expect(result).toEqual({ items: mockList });
    });
  });

  describe('add', () => {
    it('adds a reference via the service', async () => {
      const body: AddReferenceDto = {
        targetVersionId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
        relation: 'application_form',
      };
      const mockResult = {
        id: 'ref-1',
        relation: 'application_form',
        targetVersionId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
      };
      referencesServiceMock.add.mockResolvedValue(mockResult);

      const result = await controller.add(mockUser, 'service-1', 'version-1', body);

      expect(referencesServiceMock.add).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
        body,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('remove', () => {
    it('removes a reference via the service', async () => {
      referencesServiceMock.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser, 'service-1', 'version-1', 'ref-1');

      expect(referencesServiceMock.remove).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
        'ref-1',
      );
    });
  });

  describe('archive', () => {
    it('archives a reference via the service', async () => {
      referencesServiceMock.archive.mockResolvedValue(undefined);

      await controller.archive(mockUser, 'service-1', 'version-1', 'ref-1');

      expect(referencesServiceMock.archive).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
        'ref-1',
      );
    });
  });

  describe('createForm', () => {
    it('creates a referenced form via the service', async () => {
      const body: CreateReferencedFormDto = {
        typeId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        title: 'New Referenced Form',
      };
      const mockResult = { id: 'ref-1', targetDocumentId: 'form-1' };
      referencesServiceMock.createForm.mockResolvedValue(mockResult);

      const result = await controller.createForm(mockUser, 'service-1', 'version-1', body);

      expect(referencesServiceMock.createForm).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
        body,
      );
      expect(result).toEqual(mockResult);
    });
  });
});
