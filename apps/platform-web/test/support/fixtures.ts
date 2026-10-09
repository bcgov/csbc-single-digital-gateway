import type { AgreementScope } from '@/components/console/service-agreements/scope';
import type { WorkspaceLike } from './render-app';
import type { SubmissionDetail as SubmissionDetailData } from '@/lib/submissions';
import type { GeoCountryOption } from '@repo/react/jsonforms-renderers';
import type { ServiceAgreementSummary } from '@/lib/service-agreements';
import type { ContainerNode } from '@/components/form-builder/model';

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

export const globalAgreement = {
  id: 'g1',
  workspaceId: null,
  title: 'Global Privacy Policy',
  kind: 'service-agreement',
  createdAt: ISO,
  status: 'published',
  isGlobal: true,
};

export const serviceAgreement: ServiceAgreementSummary = {
  id: 'g1',
  workspaceId: null,
  title: 'Global Privacy Policy',
  kind: 'service-agreement',
  createdAt: ISO,
  updatedAt: ISO,
  status: 'draft',
  isGlobal: false,
};

export const serviceAgreementVersion = {
  id: 'v1',
  version: 1,
  status: 'draft',
  data: {
    title: 'Global Privacy Policy',
    body: 'This is the draft agreement content.',
  },
  createdAt: ISO,
  publishedAt: null,
  archivedAt: null,
};

export const serviceAgreementDefinition = {
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      body: { type: 'string' },
    },
  },
  uischema: {},
};

export const serviceAgreementsDetailResponse = {
  agreement: serviceAgreement,
  versions: [serviceAgreementVersion],
  definition: serviceAgreementDefinition,
  services: [],
};

export const workspaceScope: AgreementScope = {
  kind: 'workspace',
  slug: 'riverton',
  workspaceId: 'w1',
};

export const adminScope: AgreementScope = { kind: 'admin' };

export const mockFormTypes = {
  items: [
    {
      type: {
        id: 'type-basic',
        name: 'Basic Form',
        kind: 'basic-form',
      },
    },
    {
      type: {
        id: 'type-multistage',
        name: 'Multi-stage Form',
        kind: 'multi-stage-form',
      },
    },
  ],
};

export const mockBasicSubmission: SubmissionDetailData = {
  id: 'sub-123',
  serviceId: 'srv-123',
  serviceTitle: 'Parking Permits',
  formId: 'form-123',
  formTitle: 'Application Form',
  applicantName: 'Test User',
  applicantEmail: 'test@example.com',
  status: 'pending',
  statusLabel: 'Pending Review',
  reference: 'REF-0001',
  submittedAt: '2026-07-15T00:00:00Z',
  updatedAt: '2026-07-15T00:00:00Z',
  kind: 'basic-form',
  structure: {
    schema: { type: 'object', properties: { parkingType: { type: 'string' } } },
    uischema: { type: 'VerticalLayout', elements: [] },
  },
  data: { parkingType: 'Residential' },
  reviews: [],
};

export const COUNTRIES: GeoCountryOption[] = [
  { id: 39, name: 'Canada', iso2: 'CA', hasStates: true, hasPostal: true },
];

export const EMPTY: { schema: Record<string, unknown>; uischema: Record<string, unknown> } = {
  schema: { type: 'object', properties: {}, required: [] },
  uischema: { type: 'VerticalLayout', elements: [] },
};

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

export const mockBasicFormDraft = {
  form: {
    id: 'am-789',
    workspaceId: 'w1',
    title: 'Parking Application',
    kind: 'basic-form',
    createdAt: ISO,
  },
  version: {
    id: 'v-1',
    documentId: 'am-789',
    version: 1,
    status: 'draft' as const,
    schema: {
      schema: {
        type: 'object',
        title: 'Parking Application',
        properties: {
          licensePlate: { type: 'string', title: 'License Plate' },
        },
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [{ type: 'Control', scope: '#/properties/licensePlate' }],
      },
    },
    createdAt: ISO,
  },
};

export const mockDefinition = {
  schema: {
    type: 'object',
    properties: { name: { type: 'string', title: 'Full Name' } },
  },
  uischema: {
    type: 'VerticalLayout',
    elements: [],
  },
};

// Grid container with columns fallback
export const gridNode: ContainerNode = {
  kind: 'container',
  layout: 'grid',
  children: [],
};
