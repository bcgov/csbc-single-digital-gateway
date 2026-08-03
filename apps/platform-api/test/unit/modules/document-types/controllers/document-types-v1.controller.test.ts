import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DocumentTypesV1Controller } from '../../../../../src/modules/document-types/controllers/document-types-v1.controller';

describe('DocumentTypesV1Controller', () => {
  let controller: DocumentTypesV1Controller;
  let typesServiceMock: any;

  beforeEach(() => {
    typesServiceMock = {
      staffList: vi.fn(),
      staffGet: vi.fn(),
      staffGetVersion: vi.fn(),
    };

    controller = new DocumentTypesV1Controller(typesServiceMock);
  });

  it('list returns items from types service', async () => {
    const mockList = [{ id: 'type-1', name: 'Type 1' }];
    typesServiceMock.staffList.mockResolvedValue(mockList);

    const result = await controller.list();
    expect(typesServiceMock.staffList).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ items: mockList });
  });

  it('get returns a single type from types service', async () => {
    const mockType = { id: 'type-1', name: 'Type 1', versions: [] };
    typesServiceMock.staffGet.mockResolvedValue(mockType);

    const result = await controller.get('type-1');
    expect(typesServiceMock.staffGet).toHaveBeenCalledWith('type-1');
    expect(result).toEqual(mockType);
  });

  it('getVersion returns a specific version from types service', async () => {
    const mockVersion = { id: 'v-1', status: 'published', definition: {} };
    typesServiceMock.staffGetVersion.mockResolvedValue(mockVersion);

    const result = await controller.getVersion('type-1', 'v-1');
    expect(typesServiceMock.staffGetVersion).toHaveBeenCalledWith('type-1', 'v-1');
    expect(result).toEqual(mockVersion);
  });
});
