import { describe, expect, it } from 'vitest';
import { canEditAgreementVersion } from '@/components/console/service-agreements/agreement-editability';

const base = {
  versionStatus: 'draft',
  isGlobal: false,
  isAdmin: false,
  serviceScope: false,
  serviceVersionIsDraft: true,
};

describe('canEditAgreementVersion', () => {
  it('allows editing a workspace draft in the standalone (non-service) scope', () => {
    expect(canEditAgreementVersion(base)).toBe(true);
  });

  it('blocks a non-draft agreement version', () => {
    expect(canEditAgreementVersion({ ...base, versionStatus: 'published' })).toBe(false);
    expect(canEditAgreementVersion({ ...base, versionStatus: undefined })).toBe(false);
  });

  it('blocks a global agreement for non-admins, allows it for admins', () => {
    expect(canEditAgreementVersion({ ...base, isGlobal: true, isAdmin: false })).toBe(false);
    expect(canEditAgreementVersion({ ...base, isGlobal: true, isAdmin: true })).toBe(true);
  });

  it('in service scope, blocks editing when the owning service version is NOT a draft', () => {
    expect(
      canEditAgreementVersion({ ...base, serviceScope: true, serviceVersionIsDraft: false }),
    ).toBe(false);
  });

  it('in service scope, allows editing when the owning service version IS a draft', () => {
    expect(
      canEditAgreementVersion({ ...base, serviceScope: true, serviceVersionIsDraft: true }),
    ).toBe(true);
  });
});
