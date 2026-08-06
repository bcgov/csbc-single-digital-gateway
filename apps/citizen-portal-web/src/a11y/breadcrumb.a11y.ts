import type { ComponentA11yMetadata } from '@repo/ui/a11y-types';

export default {
  component: 'breadcrumb',
  wcagCriteria: [
    { id: '2.4.8', name: 'Location', level: 'AAA' },
    { id: '1.3.1', name: 'Info and Relationships', level: 'A' },
    { id: '4.1.2', name: 'Name, Role, Value', level: 'A' },
  ],
  ariaPattern: {
    name: 'Breadcrumb',
    url: 'https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/',
  },
  rules: [
    {
      id: 'nav-labelled',
      description: 'The trail is wrapped in a <nav aria-label="Breadcrumb"> landmark.',
      severity: 'required',
    },
    {
      id: 'current-page-marked',
      description:
        'The last crumb (no href) renders as plain text with aria-current="page" rather than a link, so assistive tech announces it as the current location.',
      severity: 'required',
    },
    {
      id: 'separator-hidden',
      description: 'The slash separator icon between crumbs is decorative — aria-hidden={true}.',
      severity: 'required',
    },
  ],
  commonMisuses: [
    "Giving the current (last) crumb an href — it should be the plain aria-current='page' span, not a link to the page the user is already on.",
  ],
  notes: [],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
