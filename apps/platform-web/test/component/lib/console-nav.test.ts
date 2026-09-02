import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_NAV,
  ALL_DESTINATIONS,
  OVERVIEW_NAV,
  SERVICE_AGREEMENTS_NAV,
  SERVICE_REQUESTS_NAV,
  SETTINGS_NAV,
  SHARED_RESOURCES_NAV,
  TEAM_NAV,
  TOP_NAV,
  sectionFor,
} from '@/lib/console-nav';

describe('Console Nav Unit Test Suite', () => {
  it('TOP_NAV is the five primary destinations in order', () => {
    expect(TOP_NAV.map((item) => item.key)).toEqual([
      'overview',
      'services',
      'submissions',
      'shared-resources',
      'settings',
    ]);
    expect(TOP_NAV.map((item) => item.label)).toEqual([
      'Overview',
      'Services',
      'Service Requests',
      'Shared Resources',
      'Settings',
    ]);
  });

  it('Service Requests is a label-only rename of Submissions (route unchanged)', () => {
    expect(SERVICE_REQUESTS_NAV.label).toBe('Service Requests');
    expect(SERVICE_REQUESTS_NAV.to).toBe('/app/$slug/submissions');
    expect(SERVICE_REQUESTS_NAV.key).toBe('submissions');
  });

  it('Shared Resources is a new scoped hub route', () => {
    expect(SHARED_RESOURCES_NAV.to).toBe('/app/$slug/shared-resources');
    expect(SHARED_RESOURCES_NAV.scoped).toBe(true);
  });

  it('Reports is gone from every destination list', () => {
    expect(TOP_NAV.some((item) => item.key === 'reports')).toBe(false);
    expect(ALL_DESTINATIONS.some((item) => item.key === 'reports')).toBe(false);
  });

  it('command-palette destinations still include the reachable-but-not-top-nav sections', () => {
    const keys = ALL_DESTINATIONS.map((item) => item.key);
    expect(keys).toContain('service-agreements');
    expect(keys).toContain('team');
    expect(keys).toContain('account');
  });

  it('sectionFor resolves segments (including renamed/moved sections) or falls back to Overview', () => {
    expect(sectionFor('/app/my-slug')).toBe(OVERVIEW_NAV);
    expect(sectionFor('/app/account')).toBe(ACCOUNT_NAV);
    expect(sectionFor('/app/my-slug/submissions')).toBe(SERVICE_REQUESTS_NAV);
    expect(sectionFor('/app/my-slug/shared-resources')).toBe(SHARED_RESOURCES_NAV);
    expect(sectionFor('/app/my-slug/service-agreements')).toBe(SERVICE_AGREEMENTS_NAV);
    expect(sectionFor('/app/my-slug/team')).toBe(TEAM_NAV);
    expect(sectionFor('/app/my-slug/settings')).toBe(SETTINGS_NAV);
    // Reports no longer exists → fallback.
    expect(sectionFor('/app/my-slug/reports')).toBe(OVERVIEW_NAV);
    expect(sectionFor('/admin/document-types')).toBe(OVERVIEW_NAV);
  });
});
