import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminDocumentTypesV1Controller } from '../../../../../src/modules/document-types/controllers/admin-document-types-v1.controller';

describe('AdminDocumentTypesV1Controller', () => {
  let controller: AdminDocumentTypesV1Controller;
  let typesServiceMock: any;
  let versionsServiceMock: any;

  beforeEach(() => {
    typesServiceMock = {
      adminList: vi.fn(),
      adminGet: vi.fn(),
    };

    versionsServiceMock = {
      addVersion: vi.fn(),
      editDraft: vi.fn(),
      deleteDraft: vi.fn(),
      publish: vi.fn(),
      archive: vi.fn(),
    };

    controller = new AdminDocumentTypesV1Controller(typesServiceMock, versionsServiceMock);
  });

  it('list returns items from types service', async () => {
    const mockList = [{ id: 'type-1', name: 'Type 1' }];
    typesServiceMock.adminList.mockResolvedValue(mockList);

    const result = await controller.list();
    expect(typesServiceMock.adminList).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ items: mockList });
  });

  it('get returns a single type from types service', async () => {
    const mockType = { id: 'type-1', name: 'Type 1', versions: [] };
    typesServiceMock.adminGet.mockResolvedValue(mockType);

    const result = await controller.get('type-1');
    expect(typesServiceMock.adminGet).toHaveBeenCalledWith('type-1');
    expect(result).toEqual(mockType);
  });

  it('addVersion adds a new version via versions service', async () => {
    const mockVersion = { id: 'v-1', definition: { field: 'test' } };
    versionsServiceMock.addVersion.mockResolvedValue(mockVersion);

    const result = await controller.addVersion('type-1', { definition: { field: 'test' } } as any);
    expect(versionsServiceMock.addVersion).toHaveBeenCalledWith('type-1', { field: 'test' });
    expect(result).toEqual(mockVersion);
  });

  it('editVersion edits a draft version via versions service', async () => {
    const mockVersion = { id: 'v-1', definition: { field: 'updated' } };
    versionsServiceMock.editDraft.mockResolvedValue(mockVersion);

    const result = await controller.editVersion('type-1', 'v-1', {
      definition: { field: 'updated' },
    } as any);
    expect(versionsServiceMock.editDraft).toHaveBeenCalledWith('type-1', 'v-1', {
      field: 'updated',
    });
    expect(result).toEqual(mockVersion);
  });

  it('deleteVersion deletes a draft version via versions service', async () => {
    versionsServiceMock.deleteDraft.mockResolvedValue(undefined);

    await controller.deleteVersion('type-1', 'v-1');
    expect(versionsServiceMock.deleteDraft).toHaveBeenCalledWith('type-1', 'v-1');
  });

  it('publish publishes a draft version via versions service', async () => {
    const mockVersion = { id: 'v-1', status: 'published' };
    versionsServiceMock.publish.mockResolvedValue(mockVersion);

    const result = await controller.publish('type-1', 'v-1');
    expect(versionsServiceMock.publish).toHaveBeenCalledWith('type-1', 'v-1');
    expect(result).toEqual(mockVersion);
  });

  it('archive archives a version via versions service', async () => {
    const mockVersion = { id: 'v-1', status: 'archived' };
    versionsServiceMock.archive.mockResolvedValue(mockVersion);

    const result = await controller.archive('type-1', 'v-1');
    expect(versionsServiceMock.archive).toHaveBeenCalledWith('type-1', 'v-1');
    expect(result).toEqual(mockVersion);
  });
});
