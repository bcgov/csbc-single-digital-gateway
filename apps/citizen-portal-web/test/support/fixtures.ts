export const authedUser = {
  id: 'c1',
  roles: ['citizen'],
  claims: {
    sub: 'subject-1',
    display_name: 'Amina Ali',
    given_name: 'Amina',
    family_name: 'Ali',
    email: 'amina@example.com',
    name: 'Amina Ali',
  },
};

export const adminUser = {
  id: 'u-123',
  roles: ['admin'],
  claims: {
    sub: 'sub-123',
    name: 'Test User',
    email: 'test@example.com',
    preferred_username: 'Tester',
  },
};

export const applicationDetail = {
  id: 'sub1',
  reference: '20260630-0001',
  status: 'pending',
  statusLabel: 'Submitted',
  formId: 'f1',
  formVersionId: 'fv1',
  formTitle: 'Your Profile',
  serviceId: 'svc-1',
  serviceTitle: 'Birth Registration',
  kind: 'basic-form',
  title: 'Your Profile',
  structure: {
    schema: { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
    uischema: {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    },
  },
  data: { name: 'Amina' },
  reviewReason: null as string | null,
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
  submittedAt: '2026-06-30T00:00:00.000Z' as string | null,
};

export const applicationsList = [
  {
    id: 'a1',
    serviceId: 's2',
    serviceVersionId: 'v1',
    serviceTitle: 'Birth Registration',
    formTitle: 'Birth Registration application',
    reference: '20250615-0003',
    status: 'in_review',
    statusLabel: 'Review',
    lastUpdated: '2025-06-30T00:00:00.000Z',
  },
];

export const form = {
  serviceId: 'svc-1',
  formId: 'f1',
  formVersionId: 'fv1',
  kind: 'basic-form',
  title: 'Your Profile',
  structure: {
    schema: { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
    uischema: {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    },
  },
};

export const draft = {
  id: 'sub1',
  formId: 'f1',
  formVersionId: 'fv1',
  status: 'draft',
  data: {},
  reference: '20260630-0001',
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
  submittedAt: null,
};

export const services = [
  { id: 's1', title: 'Income and Disability Assistance', description: 'Financial support.' },
  { id: 's2', title: 'Birth Registration', description: 'Register the birth of a child in B.C.' },
];

export const schema = {
  type: 'object',
  properties: {
    title: { type: 'string', title: 'Title' },
    description: { type: 'string', title: 'Description' },
    about: { type: 'object', title: 'About' },
  },
};

export const uischema = {
  type: 'VerticalLayout',
  elements: [
    { type: 'Control', scope: '#/properties/title' },
    { type: 'Control', scope: '#/properties/description' },
    { type: 'Control', scope: '#/properties/about', options: { format: 'richtext' } },
  ],
};

export const version = {
  id: 'ver-1',
  serviceId: 'svc-1',
  version: 1,
  status: 'archived',
  title: 'Service One',
  data: { title: 'Service One', description: 'The original copy.' },
  schema,
  uischema,
  createdAt: '2024-01-01T00:00:00.000Z',
  publishedAt: null,
  archivedAt: '2024-06-01T00:00:00.000Z',
};

export const serviceDetail = {
  id: 'svc-1',
  title: 'Service One',
  description: 'Financial support for residents.',
  publishedVersionId: 'ver-3',
  version: 3,
  publishedAt: '2025-01-15T00:00:00.000Z',
  data: { title: 'Service One', description: 'Financial support for residents.' },
  schema,
  uischema,
  applications: [
    {
      id: 'ref-1',
      label: 'Apply online',
      title: 'Your Profile',
      formId: 'f1',
      formVersionId: 'fv1',
      kind: 'basic-form',
      url: null,
    },
    {
      id: 'ref-2',
      label: 'Apply on GOV.UK',
      title: 'Apply on GOV.UK',
      formId: 'ext-1',
      formVersionId: 'extv-1',
      kind: 'external-application',
      url: 'https://gov.uk/apply',
    },
  ],
};

export const urlCalls: string[] = [];

export const FEED = {
  items: [
    {
      deliveryId: 'd-1',
      notificationId: 'n-1',
      type: 'application.approved',
      title: 'Your application was approved',
      body: 'A decision was recorded.',
      payload: { submissionId: 'sub-1' },
      createdAt: new Date().toISOString(),
      readAt: null,
    },
    {
      deliveryId: 'd-2',
      notificationId: 'n-2',
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
