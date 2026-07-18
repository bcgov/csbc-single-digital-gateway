import { describe, expect, it } from 'vitest';
import {
  sectionFor,
  OVERVIEW_NAV,
  ACCOUNT_NAV,
  PRIMARY_NAV,
  SECONDARY_NAV,
  SETTINGS_NAV,
} from '@/lib/console-nav';

describe('sectionFor helper', () => {
  it('returns OVERVIEW_NAV for overview path or base slug paths', () => {
    expect(sectionFor('/app/my-slug')).toBe(OVERVIEW_NAV);
    expect(sectionFor('/app/my-slug/')).toBe(OVERVIEW_NAV);
    expect(sectionFor('/')).toBe(OVERVIEW_NAV);
    expect(sectionFor('')).toBe(OVERVIEW_NAV);
  });

  it('returns ACCOUNT_NAV when segment 1 is account', () => {
    expect(sectionFor('/app/account')).toBe(ACCOUNT_NAV);
    expect(sectionFor('/app/account/')).toBe(ACCOUNT_NAV);
    expect(sectionFor('/app/account/billing')).toBe(ACCOUNT_NAV);
  });

  it('returns correct NavItem for valid workspace-scoped sub-destinations', () => {
    const servicesItem = PRIMARY_NAV.find((item) => item.key === 'services');
    expect(servicesItem).toBeDefined();
    expect(sectionFor('/app/my-slug/services')).toBe(servicesItem);

    const submissionsItem = PRIMARY_NAV.find((item) => item.key === 'submissions');
    expect(submissionsItem).toBeDefined();
    expect(sectionFor('/app/my-slug/submissions')).toBe(submissionsItem);

    const reportsItem = SECONDARY_NAV.find((item) => item.key === 'reports');
    expect(reportsItem).toBeDefined();
    expect(sectionFor('/app/my-slug/reports')).toBe(reportsItem);

    expect(sectionFor('/app/my-slug/settings')).toBe(SETTINGS_NAV);
  });

  it('falls back to OVERVIEW_NAV for invalid sections or cross-origin paths', () => {
    expect(sectionFor('/app/my-slug/non-existent-subpath')).toBe(OVERVIEW_NAV);
    expect(sectionFor('/admin/document-types')).toBe(OVERVIEW_NAV);
    expect(sectionFor('/portal/overview')).toBe(OVERVIEW_NAV);
  });
});
