import { describe, expect, it } from 'vitest';
import { adminSectionFor, ADMIN_OVERVIEW, ADMIN_NAV } from '@/lib/admin-nav';

describe('adminSectionFor helper', () => {
  it('returns ADMIN_OVERVIEW for core admin path or base empty pathnames', () => {
    expect(adminSectionFor('/admin')).toBe(ADMIN_OVERVIEW);
    expect(adminSectionFor('/admin/')).toBe(ADMIN_OVERVIEW);
    expect(adminSectionFor('/')).toBe(ADMIN_OVERVIEW);
    expect(adminSectionFor('')).toBe(ADMIN_OVERVIEW);
  });

  it('returns matched AdminNavItem when path starts with admin and matches a key', () => {
    const docTypesItem = ADMIN_NAV.find((item) => item.key === 'document-types');
    expect(docTypesItem).toBeDefined();

    expect(adminSectionFor('/admin/document-types')).toBe(docTypesItem);
    expect(adminSectionFor('/admin/document-types/')).toBe(docTypesItem);
    expect(adminSectionFor('/admin/document-types/new')).toBe(docTypesItem);
  });

  it('falls back to ADMIN_OVERVIEW for invalid admin paths or cross-app pathnames', () => {
    expect(adminSectionFor('/admin/non-existent-subpath')).toBe(ADMIN_OVERVIEW);
    expect(adminSectionFor('/portal/document-types')).toBe(ADMIN_OVERVIEW);
    expect(adminSectionFor('/user/settings')).toBe(ADMIN_OVERVIEW);
  });
});
