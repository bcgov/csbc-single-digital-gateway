import { createDocumentStore, type DocumentStore, type StoredDocument } from './document-store';
import type { CapabilityMap } from './capabilities/capability-types';
import type { DocumentContent } from './document-types';

const control = (id: string, key: string) => ({
  id,
  type: 'Control',
  scope: `#/properties/${key}`,
});

/** The agreement template's content (doc 259): an intro, the acceptance a service must keep, and a signature. */
const AGREEMENT_CONTENT: DocumentContent = {
  schema: {
    type: 'object',
    properties: {
      accept: { type: 'boolean', title: 'I accept the terms of use' },
      signature: { type: 'string', title: 'Full name' },
    },
    required: ['accept'],
  },
  variants: {
    default: {
      id: 'stubAgr1',
      type: 'Form',
      label: 'Terms of use',
      elements: [
        { id: 'stubAgrH', type: 'Heading', options: { text: 'About these terms', level: 2 } },
        control('stubAgrAcc', 'accept'),
        control('stubAgrSig', 'signature'),
      ],
    },
  },
};

/** Its Implementation Rules (doc 258): the heading and the acceptance are fixed; only the acceptance's wording may change. */
const AGREEMENT_RULES: CapabilityMap = {
  elements: {
    stubAgrH: { edit: 'none', remove: false },
    stubAgrAcc: { edit: ['label', 'description'], remove: false, move: false },
  },
};

/** A two-Form Funnel with fields of every kind a condition can test, so conditions have something to branch on. */
const APPLICATION_CONTENT: DocumentContent = {
  schema: {
    type: 'object',
    properties: {
      age: { type: 'integer', title: 'Age' },
      resident: { type: 'boolean', title: 'BC resident' },
      // Doc 237's boolean controls, so a Checkbox and a Switch can be seen with and without a description.
      consent: {
        type: 'boolean',
        title: 'I agree to the terms',
        description: 'You can withdraw your consent at any time.',
      },
      updates: { type: 'boolean', title: 'Email me about my application' },
      reminders: { type: 'boolean', title: 'Send reminders' },
      region: {
        type: 'string',
        title: 'Region',
        oneOf: [
          { const: 'north', title: 'North' },
          { const: 'interior', title: 'Interior' },
          { const: 'coast', title: 'Coast' },
        ],
      },
      name: { type: 'string', title: 'Full name' },
    },
  },
  variants: {
    default: {
      id: 'stubFun1',
      type: 'Funnel',
      elements: [
        {
          id: 'stubElig',
          type: 'Form',
          label: 'Eligibility',
          elements: [
            {
              id: 'stubHdg1',
              type: 'Heading',
              options: { text: 'Check you can apply', level: 2 },
            },
            control('stubAge1', 'age'),
            control('stubRes1', 'resident'),
            control('stubReg1', 'region'),
            control('stubCns1', 'consent'),
            {
              ...control('stubUpd1', 'updates'),
              options: {
                component: 'switch',
                description: 'We only email when something changes.',
              },
            },
            { ...control('stubRem1', 'reminders'), options: { component: 'switch' } },
          ],
        },
        { id: 'stubDetl', type: 'Form', label: 'Details', elements: [control('stubNam1', 'name')] },
      ],
      options: {
        start: 'stubElig',
        conditions: [],
        edges: [{ id: 'stubEdg1', source: 'stubElig', target: 'stubDetl' }],
      },
    },
  },
};

/**
 * SPIKE seed data, so loading has something to open before the API is wired. Fixed ids, so a URL such as
 * `?documentId=stub-service` works on any machine; the service has two versions to exercise version picking, and
 * `stub-application` has fields upstream of where a condition would go.
 */
export const STUB_DOCUMENTS: StoredDocument[] = [
  {
    id: 'stub-service',
    kind: 'document',
    type: 'services.service',
    versions: [
      {
        id: 'stub-service-v1',
        versionNumber: 1,
        content: {
          schema: { type: 'object', properties: {} },
          variants: {
            default: {
              id: 'stubSvc1',
              type: 'Form',
              label: 'Fishing licence (v1)',
              elements: [],
            },
          },
        },
      },
      {
        id: 'stub-service-v2',
        versionNumber: 2,
        content: {
          schema: { type: 'object', properties: {} },
          variants: {
            default: {
              id: 'stubSvc2',
              type: 'Form',
              label: 'Fishing licence (v2)',
              elements: [],
            },
          },
        },
      },
    ],
  },
  {
    id: 'stub-agreement-template',
    kind: 'template',
    type: 'services.service-agreement',
    versions: [
      {
        id: 'stub-agreement-template-v1',
        versionNumber: 1,
        content: { ...AGREEMENT_CONTENT, capabilities: AGREEMENT_RULES },
      },
    ],
  },
  {
    // Doc 259: a document made from the template above — its pinned version's rules lock the studio.
    id: 'stub-agreement',
    kind: 'document',
    type: 'services.service-agreement',
    template: {
      templateId: 'stub-agreement-template',
      templateVersionId: 'stub-agreement-template-v1',
    },
    versions: [{ id: 'stub-agreement-v1', versionNumber: 1, content: AGREEMENT_CONTENT }],
  },
  {
    id: 'stub-application',
    kind: 'document',
    type: 'services.service-application-method',
    versions: [{ id: 'stub-application-v1', versionNumber: 1, content: APPLICATION_CONTENT }],
  },
];

let browserStore: DocumentStore | undefined;

/** The store `DocumentStudio` uses when none is passed: the seed, persisted to `localStorage`. */
export function browserDocumentStore(): DocumentStore {
  browserStore ??= createDocumentStore({ storage: localStorageOrNull(), seed: STUB_DOCUMENTS });
  return browserStore;
}

function localStorageOrNull(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch (error) {
    console.error(
      '[documents] localStorage is unavailable; the stub store keeps documents in memory',
      error,
    );
    return null;
  }
}
