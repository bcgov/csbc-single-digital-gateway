import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminDocumentTypesV1Controller } from '../../../../../src/modules/document-types/controllers/admin-document-types-v1.controller';
import { createMockList, createMockTypeVersion } from '../../../../utils/test-helpers';

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

  it('Should list returns items from types service when calling the admin controller list method', async () => {
    const mockList = createMockList();
    typesServiceMock.adminList.mockResolvedValue(mockList);

    const result = await controller.list();
    expect(typesServiceMock.adminList).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ items: mockList });
  });

  it('Should get returns a single type from types service when calling the admin controller get method', async () => {
    const mockType = { id: 'type-1', name: 'Type 1', versions: [] };
    typesServiceMock.adminGet.mockResolvedValue(mockType);

    const result = await controller.get('type-1');
    expect(typesServiceMock.adminGet).toHaveBeenCalledWith('type-1');
    expect(result).toEqual(mockType);
  });

  it('Should addVersion adds a new version via versions service', async () => {
    const mockTypeVersion = createMockTypeVersion({ definition: { field: 'test' } });
    versionsServiceMock.addVersion.mockResolvedValue(mockTypeVersion);

    const result = await controller.addVersion('type-1', { definition: { field: 'test' } } as any);
    expect(versionsServiceMock.addVersion).toHaveBeenCalledWith('type-1', { field: 'test' });
    expect(result).toEqual(mockTypeVersion);
  });

  it('Should editVersion edits a draft version via versions service', async () => {
    const mockTypeVersion = createMockTypeVersion({ definition: { field: 'updated' } });
    versionsServiceMock.editDraft.mockResolvedValue(mockTypeVersion);

    const result = await controller.editVersion('type-1', 'v-1', {
      definition: { field: 'updated' },
    } as any);
    expect(versionsServiceMock.editDraft).toHaveBeenCalledWith('type-1', 'v-1', {
      field: 'updated',
    });
    expect(result).toEqual(mockTypeVersion);
  });

  it('Should deleteVersion deletes a draft version via versions service', async () => {
    versionsServiceMock.deleteDraft.mockResolvedValue(undefined);

    await controller.deleteVersion('type-1', 'v-1');
    expect(versionsServiceMock.deleteDraft).toHaveBeenCalledWith('type-1', 'v-1');
  });

  it('Should publish publishes a draft version via versions service', async () => {
    const mockTypeVersion = createMockTypeVersion({ status: 'published' });
    versionsServiceMock.publish.mockResolvedValue(mockTypeVersion);

    const result = await controller.publish('type-1', 'v-1');
    expect(versionsServiceMock.publish).toHaveBeenCalledWith('type-1', 'v-1');
    expect(result).toEqual(mockTypeVersion);
  });

  it('Should archive archives a version via versions service', async () => {
    const mockTypeVersion = createMockTypeVersion({ status: 'archived' });
    versionsServiceMock.archive.mockResolvedValue(mockTypeVersion);

    const result = await controller.archive('type-1', 'v-1');
    expect(versionsServiceMock.archive).toHaveBeenCalledWith('type-1', 'v-1');
    expect(result).toEqual(mockTypeVersion);
  });
});
