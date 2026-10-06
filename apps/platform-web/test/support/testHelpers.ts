import {
  createField,
  type ContainerNode,
  type ControlNode,
  type FormModel,
} from '@/components/form-builder/model';
import type { ServiceSummary } from '@/lib/services';
import { ISO } from './fixtures';

export const ctrl = (key: string): ControlNode => ({ ...createField('text'), key, label: key });

export const container = (children: ControlNode[] = []): ContainerNode => ({
  kind: 'container',
  layout: 'group',
  children,
});

export const rootKeys = (m: FormModel) =>
  m.fields.map((f) => (f.kind === 'control' ? f.key : 'GROUP'));

export const childKeys = (m: FormModel, i: number) => {
  const f = m.fields[i];
  return f && f.kind === 'container'
    ? f.children.map((c) => (c.kind === 'control' ? c.key : ''))
    : [];
};

export const group = (label: string, elements: unknown[] = []) => ({
  type: 'Group',
  label,
  elements,
});

export const service = (over: Partial<ServiceSummary>): ServiceSummary => ({
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
