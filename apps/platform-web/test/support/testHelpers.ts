import type { ServiceSummary } from '@/lib/services';
import { ISO } from './fixtures';

export const service = (over?: Partial<ServiceSummary>): ServiceSummary => ({
  id: 'srv-1',
  workspaceId: 'w1',
  title: 'Parking Permits',
  description: '',
  status: 'published',
  versionCount: 2,
  hasSubmissions: true,
  latestPublished: true,
  createdAt: '2026-07-15T00:00:00Z',
  updatedAt: '2026-07-15T12:30:00Z',
  ...over,
});

export const addMembers = (memberList?: any[]) => {
  const members = [
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
  if (memberList) {
    members.push(...memberList);
  }
  return members;
};
