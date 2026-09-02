import type { WcagCriterion } from './a11y-types';

/**
 * Every distinct WCAG success criterion referenced by a `.a11y.ts` sidecar in this repo, keyed by
 * a readable name (object keys can't start with a digit). Centralized so `id`/`name`/`level`/`url`
 * are each written once instead of copy-pasted per sidecar — add a new entry here rather than
 * inlining a fresh `{ id, name, level, url }` literal in a sidecar file.
 */
export const WCAG = {
  nonTextContent: {
    id: '1.1.1',
    name: 'Non-text Content',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
  },
  infoAndRelationships: {
    id: '1.3.1',
    name: 'Info and Relationships',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
  },
  useOfColor: {
    id: '1.4.1',
    name: 'Use of Color',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html',
  },
  keyboard: {
    id: '2.1.1',
    name: 'Keyboard',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html',
  },
  focusOrder: {
    id: '2.4.3',
    name: 'Focus Order',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html',
  },
  linkPurposeInContext: {
    id: '2.4.4',
    name: 'Link Purpose (In Context)',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html',
  },
  headingsAndLabels: {
    id: '2.4.6',
    name: 'Headings and Labels',
    level: 'AA',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html',
  },
  focusVisible: {
    id: '2.4.7',
    name: 'Focus Visible',
    level: 'AA',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html',
  },
  location: {
    id: '2.4.8',
    name: 'Location',
    level: 'AAA',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/location.html',
  },
  errorIdentification: {
    id: '3.3.1',
    name: 'Error Identification',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html',
  },
  labelsOrInstructions: {
    id: '3.3.2',
    name: 'Labels or Instructions',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html',
  },
  nameRoleValue: {
    id: '4.1.2',
    name: 'Name, Role, Value',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  },
  statusMessages: {
    id: '4.1.3',
    name: 'Status Messages',
    level: 'AA',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html',
  },
} as const satisfies Record<string, WcagCriterion>;
