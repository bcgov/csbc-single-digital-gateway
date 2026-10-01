import { vi } from 'vitest';

export const createMockService = () => {
  return {
    list: vi.fn(),
    create: vi.fn(),
    getServiceDefinition: vi.fn(),
    listForms: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
    archive: vi.fn(),
    reactivate: vi.fn(),
    requireDocument: vi.fn(),
  };
};

export const createMockServiceVersions = () => {
  return {
    updateDraft: vi.fn(),
    publish: vi.fn(),
    archive: vi.fn(),
    addVersion: vi.fn(),
    discardVersion: vi.fn(),
  };
};
