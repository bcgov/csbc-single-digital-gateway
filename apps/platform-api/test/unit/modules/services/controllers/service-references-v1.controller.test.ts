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
  let agreementRefsServiceMock: any;

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
      createExternal: vi.fn(),
      updateExternal: vi.fn(),
    };

    agreementRefsServiceMock = {
      list: vi.fn(),
      attach: vi.fn(),
      detach: vi.fn(),
    };

    controller = new ServiceReferencesV1Controller(referencesServiceMock, agreementRefsServiceMock);
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

  describe('createExternal', () => {
    it('creates a referenced external application via the service', async () => {
      const body = {
        label: 'External App',
        url: 'https://example.com/apply',
      };
      const mockResult = { id: 'ref-1', targetDocumentId: 'ext-doc-1' };
      referencesServiceMock.createExternal.mockResolvedValue(mockResult);

      const result = await controller.createExternal(mockUser, 'service-1', 'version-1', body);

      expect(referencesServiceMock.createExternal).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
        body,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateExternal', () => {
    it('updates a referenced external application via the service', async () => {
      const body = {
        label: 'New External Label',
        url: 'https://example.com/new-apply',
      };
      const mockResult = { id: 'ref-1', label: 'New External Label' };
      referencesServiceMock.updateExternal.mockResolvedValue(mockResult);

      const result = await controller.updateExternal(
        mockUser,
        'service-1',
        'version-1',
        'ref-1',
        body,
      );

      expect(referencesServiceMock.updateExternal).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
        'ref-1',
        body,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('listAgreements', () => {
    it('returns agreements list from the agreements service wrapped in an items object', async () => {
      const mockList = [{ id: 'ref-agreement-1', title: 'Agreement 1' }];
      agreementRefsServiceMock.list.mockResolvedValue(mockList);

      const result = await controller.listAgreements(mockUser, 'service-1', 'version-1');

      expect(agreementRefsServiceMock.list).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
      );
      expect(result).toEqual({ items: mockList });
    });
  });

  describe('attachAgreement', () => {
    it('attaches an agreement reference via the agreements service', async () => {
      const body = { agreementDocumentId: 'agreement-doc-123' };
      const mockResult = { id: 'ref-agreement-1', agreementDocumentId: 'agreement-doc-123' };
      agreementRefsServiceMock.attach.mockResolvedValue(mockResult);

      const result = await controller.attachAgreement(mockUser, 'service-1', 'version-1', body);

      expect(agreementRefsServiceMock.attach).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
        'agreement-doc-123',
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('detachAgreement', () => {
    it('detaches an agreement reference via the agreements service', async () => {
      agreementRefsServiceMock.detach.mockResolvedValue(undefined);

      await controller.detachAgreement(mockUser, 'service-1', 'version-1', 'ref-agreement-1');

      expect(agreementRefsServiceMock.detach).toHaveBeenCalledWith(
        mockUser.id,
        'service-1',
        'version-1',
        'ref-agreement-1',
      );
    });
  });
});
