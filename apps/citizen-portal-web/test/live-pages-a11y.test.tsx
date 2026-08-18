import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderRoute } from './support/render-app';
import { aggregateKnownExceptions, expectNoUnjustifiedA11yViolations } from './support/a11y';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// ---- / (home) + /services — anonymous catalog browsing ----

const CATALOG_SERVICES = [
  { id: 's1', title: 'Income and Disability Assistance', description: 'Financial support.' },
  { id: 's2', title: 'Birth Registration', description: 'Register the birth of a child in B.C.' },
];

function catalogFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return new Response(null, { status: 401 });
    if (url.includes('/v1/me/applications')) return new Response(null, { status: 401 });
    if (url.includes('/v1/services')) return jsonResponse({ items: CATALOG_SERVICES });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

// ---- /services/:id (+ /versions/:versionId) ----

const SERVICE_SCHEMA = {
  type: 'object',
  properties: { title: { type: 'string', title: 'Title' } },
};
const SERVICE_UISCHEMA = {
  type: 'VerticalLayout',
  elements: [{ type: 'Control', scope: '#/properties/title' }],
};
const SERVICE_DETAIL = {
  id: 'svc-1',
  title: 'Service One',
  description: 'Financial support for residents.',
  publishedVersionId: 'ver-3',
  version: 3,
  publishedAt: '2025-01-15T00:00:00.000Z',
  data: { title: 'Service One' },
  schema: SERVICE_SCHEMA,
  uischema: SERVICE_UISCHEMA,
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
  ],
};
const SERVICE_VERSION = {
  id: 'ver-1',
  serviceId: 'svc-1',
  version: 1,
  status: 'archived',
  title: 'Service One',
  data: { title: 'Service One' },
  schema: SERVICE_SCHEMA,
  uischema: SERVICE_UISCHEMA,
  createdAt: '2024-01-01T00:00:00.000Z',
  publishedAt: null,
  archivedAt: '2024-06-01T00:00:00.000Z',
};

function serviceDetailFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/versions/')) return jsonResponse(SERVICE_VERSION);
    if (/\/v1\/services\/[^?]+$/.test(url)) return jsonResponse(SERVICE_DETAIL);
    if (url.includes('/v1/services')) return jsonResponse({ items: [] });
    if (url.includes('/v1/me/applications')) return new Response(null, { status: 401 });
    if (url.includes('/auth/me')) return new Response(null, { status: 401 });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

// ---- /services/:id/apply/:formId ----

const APPLY_AUTHED_USER = {
  id: 'c1',
  roles: ['citizen'],
  claims: { sub: 'c1', name: 'Amina Ali' },
};
// Required (unlike the plain-fixture form used elsewhere) so the "clear the field" scenario below
// has a real, live validation error to scan — not just this test's own invention of one.
const APPLY_FORM = {
  serviceId: 'svc-1',
  formId: 'f1',
  formVersionId: 'fv1',
  kind: 'basic-form',
  title: 'Your Profile',
  structure: {
    schema: {
      type: 'object',
      properties: { name: { type: 'string', title: 'Name' } },
      required: ['name'],
    },
    uischema: {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    },
  },
};
const APPLY_DRAFT = {
  id: 'sub1',
  formId: 'f1',
  formVersionId: 'fv1',
  status: 'draft',
  data: { name: 'Amina' },
  reference: '20260630-0001',
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
  submittedAt: null,
};

function applyFlowFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.includes('/auth/me')) return jsonResponse(APPLY_AUTHED_USER);
    if (url.includes('/v1/me/services/') && url.endsWith('/agreements'))
      return jsonResponse({ items: [] });
    if (url.includes('/v1/services/') && url.includes('/applications/'))
      return jsonResponse(APPLY_FORM);
    if (method === 'POST' && url.endsWith('/v1/me/applications')) return jsonResponse(APPLY_DRAFT);
    if (method === 'PATCH') return jsonResponse(APPLY_DRAFT);
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

// ---- /applications/:id ----

const APP_DETAIL_AUTHED = {
  id: 'c1',
  roles: ['citizen'],
  claims: { sub: 'c1', name: 'Amina Ali' },
};
const APP_DETAIL = {
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
  structure: {
    schema: { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
    uischema: {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    },
  },
  data: { name: 'Amina' },
  reviewReason: null,
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
  submittedAt: '2026-06-30T00:00:00.000Z',
};

function applicationDetailFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return jsonResponse(APP_DETAIL_AUTHED);
    if (url.includes('/v1/me/applications/sub1')) return jsonResponse(APP_DETAIL);
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

// ---- /account ----

const ACCOUNT_AUTHED = {
  id: 'c1',
  roles: ['citizen'],
  claims: {
    sub: 'subject-1',
    display_name: 'Amina Ali',
    given_name: 'Amina',
    family_name: 'Ali',
    email: 'amina@example.com',
    birthdate: '1990-02-01',
    gender: 'female',
    address: {
      street_address: '20338 - 65 AVENUE',
      locality: 'LANGLEY',
      region: 'BC',
      postal_code: 'V2Y 3J1',
      country: 'CA',
    },
  },
};

function accountFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return jsonResponse(ACCOUNT_AUTHED);
    if (url.includes('/v1/services')) return jsonResponse({ items: [] });
    if (url.includes('/v1/me/applications')) return new Response(null, { status: 401 });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

// ---- /account/notifications ----

const NOTIF_AUTHED = {
  id: 'c1',
  roles: ['citizen'],
  claims: { sub: 'subject-1', name: 'Amina Ali', email: 'amina@example.com' },
};
const NOTIF_PREFS = {
  userId: 'c1',
  email: 'amina@example.com',
  channels: [
    { channel: 'in_app', enabled: true },
    { channel: 'email', enabled: false },
  ],
};

function notificationsFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return jsonResponse(NOTIF_AUTHED);
    if (url.includes('/notification-preferences')) return jsonResponse(NOTIF_PREFS);
    if (url.includes('/notifications/unread-count')) return jsonResponse({ count: 0 });
    if (url.includes('/v1/me/notifications'))
      return jsonResponse({ items: [], total: 0, limit: 20, offset: 0 });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

// ---- /account/service-agreements (+ /:id) ----

const AGREEMENTS_AUTHED = { id: 'c1', roles: ['citizen'], claims: { sub: 's1' } };
const AGREEMENTS = [
  {
    id: 'a1',
    agreementDocumentId: 'd1',
    title: 'Privacy Agreement',
    consentedAt: '2027-01-15T12:00:00.000Z',
  },
  {
    id: 'a2',
    agreementDocumentId: 'd2',
    title: 'Terms of Use',
    consentedAt: '2027-01-10T12:00:00.000Z',
  },
];
const AGREEMENT_DETAIL = {
  id: 'a1',
  agreementDocumentId: 'd1',
  title: 'Privacy Agreement',
  description: 'Our privacy terms',
  content: null,
  decision: 'approve',
  approveLabel: 'I accept',
  rejectLabel: 'I decline',
  consentedAt: '2027-01-15T12:00:00.000Z',
};

function agreementsListFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return jsonResponse(AGREEMENTS_AUTHED);
    if (url.includes('/v1/me/service-agreements')) return jsonResponse({ items: AGREEMENTS });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

function agreementDetailFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return jsonResponse(AGREEMENTS_AUTHED);
    if (url.includes('/v1/me/service-agreements/')) return jsonResponse(AGREEMENT_DETAIL);
    if (url.includes('/v1/me/service-agreements')) return jsonResponse({ items: [] });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

interface RealPageCase {
  path: string;
  scenario: string;
  /** `@repo/ui` primitives this scenario renders — feeds `aggregateKnownExceptions`. */
  components: string[];
  fetchImpl: () => typeof fetch;
  /** Waits for the scenario's target state to have rendered; returns the element the wait was on. */
  ready: () => Promise<unknown>;
  /** Optional interaction run after `ready`, before the axe scan (e.g. open a dialog). */
  interact?: () => Promise<void>;
  /** Defaults to the whole render container; scope to a subtree (e.g. an open dialog) instead. */
  scanRoot?: () => Element;
  timeout?: number;
}

const CASES: RealPageCase[] = [
  {
    path: '/',
    scenario: 'default (signed out)',
    components: ['button', 'card'],
    fetchImpl: catalogFetch,
    ready: () =>
      screen.findByRole(
        'heading',
        { name: 'Access government services online' },
        { timeout: 10000 },
      ),
  },
  {
    path: '/',
    scenario: 'mobile menu open',
    components: ['button', 'card'],
    fetchImpl: catalogFetch,
    ready: () =>
      screen.findByRole(
        'heading',
        { name: 'Access government services online' },
        { timeout: 10000 },
      ),
    interact: async () => {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Menu' }));
      await screen.findByRole('dialog', { name: 'Menu' });
    },
    scanRoot: () => screen.getByRole('dialog', { name: 'Menu' }),
  },
  {
    path: '/services',
    scenario: 'default',
    components: ['button', 'card'],
    fetchImpl: catalogFetch,
    ready: () => screen.findByRole('link', { name: /Birth Registration/i }, { timeout: 10000 }),
  },
  {
    path: '/services/svc-1',
    scenario: 'default',
    components: ['button', 'card', 'accordion'],
    fetchImpl: serviceDetailFetch,
    ready: () =>
      screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 10000 }),
  },
  {
    path: '/services/svc-1/versions/ver-1',
    scenario: 'default',
    components: ['badge', 'button'],
    fetchImpl: serviceDetailFetch,
    ready: () =>
      screen.findByRole('heading', { name: 'Service One', level: 1 }, { timeout: 10000 }),
  },
  {
    path: '/services/svc-1/apply/f1',
    scenario: 'default',
    components: ['button'],
    fetchImpl: applyFlowFetch,
    ready: () => screen.findByRole('heading', { name: 'Apply — Your Profile' }, { timeout: 10000 }),
    timeout: 30000,
  },
  {
    path: '/services/svc-1/apply/f1',
    scenario: 'validation error (required field cleared)',
    components: ['button'],
    fetchImpl: applyFlowFetch,
    ready: () => screen.findByRole('heading', { name: 'Apply — Your Profile' }, { timeout: 10000 }),
    interact: async () => {
      const nameInput = screen.getByLabelText('Name *');
      await userEvent.setup().clear(nameInput);
      await vi.waitFor(() => expect(nameInput).toHaveAttribute('aria-invalid', 'true'));
    },
    timeout: 30000,
  },
  {
    path: '/applications/sub1',
    scenario: 'default (submitted, read-only)',
    components: ['button', 'card'],
    fetchImpl: applicationDetailFetch,
    ready: () =>
      screen.findByRole('heading', { name: 'Your Profile', level: 1 }, { timeout: 15000 }),
    timeout: 30000,
  },
  {
    path: '/account',
    scenario: 'default',
    components: ['button', 'card'],
    fetchImpl: accountFetch,
    ready: () => screen.findByRole('heading', { name: 'Account settings' }, { timeout: 10000 }),
  },
  {
    path: '/account/notifications',
    scenario: 'default',
    components: ['button'],
    fetchImpl: notificationsFetch,
    ready: () =>
      screen.findByRole('heading', { name: 'Notification settings' }, { timeout: 10000 }),
  },
  {
    path: '/account/service-agreements',
    scenario: 'default',
    components: ['button', 'card'],
    fetchImpl: agreementsListFetch,
    ready: () => screen.findByText('Privacy Agreement', {}, { timeout: 10000 }),
  },
  {
    path: '/account/service-agreements/a1',
    scenario: 'default',
    components: ['button', 'card'],
    fetchImpl: agreementDetailFetch,
    ready: () =>
      screen.findByRole('heading', { name: 'Privacy Agreement', level: 1 }, { timeout: 10000 }),
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(CASES)('a11y: $path — $scenario', (testCase) => {
  it(
    'has no unjustified axe violations',
    async () => {
      const { container } = renderRoute(testCase.path, testCase.fetchImpl());
      await testCase.ready();
      if (testCase.interact) {
        await testCase.interact();
      }
      const scanRoot = testCase.scanRoot ? testCase.scanRoot() : container;
      const knownExceptions = aggregateKnownExceptions(testCase.components);
      await expectNoUnjustifiedA11yViolations(scanRoot, knownExceptions);
    },
    testCase.timeout ?? 20000,
  );
});
