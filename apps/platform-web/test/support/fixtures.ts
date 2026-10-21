import type { AgreementScope } from '@/components/console/service-agreements/scope';
import type { WorkspaceLike } from './render-app';

/**
 * ISO 8601 date string fixture.
 */
export const ISO = '2026-06-01T00:00:00.000Z';

/**
 * Admin user fixture.
 */
export const adminUser = {
  id: 'u1',
  roles: ['admin'],
  claims: {
    sub: 'u1',
    name: 'Maya Reyes',
    email: 'maya.reyes@riverton.gov',
    preferred_username: 'Tester',
  },
};

/**
 * Preferences fixture for a user with in_app notifications enabled and email notifications disabled.
 */
export const PREFS = {
  userId: 'u1',
  email: 'maya.reyes@riverton.gov',
  channels: [
    { channel: 'in_app', enabled: true },
    { channel: 'email', enabled: false },
  ],
};

/**
 * Workspace fixture.
 */
export const adminWorkspace: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  ownerId: 'u1',
  createdAt: ISO,
};

/**
 * Feed fixture with two items, one for staff and one for plain.
 */
export const FEED = {
  items: [
    {
      deliveryId: 'd-staff',
      notificationId: 'n-staff',
      type: 'submission.received',
      title: 'New application received',
      body: 'Application 20260710-AB12 for Income Assistance was submitted and is ready for review.',
      payload: { submissionId: 'sub1', workspaceSlug: 'riverton' },
      createdAt: new Date().toISOString(),
      readAt: null,
    },
    {
      deliveryId: 'd-plain',
      notificationId: 'n-plain',
      type: 'demo.announcement',
      title: 'No destination here',
      body: null,
      payload: null,
      createdAt: new Date().toISOString(),
      readAt: new Date().toISOString(),
    },
  ],
  total: 2,
  limit: 20,
  offset: 0,
};

export const members = [
  {
    id: 'm1',
    userId: 'u1',
    role: 'admin' as const,
    status: 'active' as const,
    displayName: 'Maya Reyes',
    email: 'maya@riverton.gov',
    isOwner: true,
    joinedAt: ISO,
  },
];

export const workspaceScope: AgreementScope = {
  kind: 'workspace',
  slug: 'riverton',
  workspaceId: 'w1',
};

export const adminScope: AgreementScope = { kind: 'admin' };

export const mockWorkspaceMember = {
  ...adminWorkspace,
  role: 'member' as const,
  ownerId: 'u2', // Sam Lee
};

export const mockUserNoEmail = {
  id: 'u-123',
  roles: ['admin'],
  claims: {
    sub: 'sub-123',
    name: 'Test User No Email',
    preferred_username: 'Tester',
  },
};

export const defaultAgreement = {
  id: 'd1',
  agreementDocumentId: 'a1',
  title: 'Terms of service',
  isOptional: false,
  isGlobal: false,
  createdAt: ISO,
};
