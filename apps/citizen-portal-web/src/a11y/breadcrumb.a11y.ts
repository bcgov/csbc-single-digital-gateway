import type { ComponentA11yMetadata } from '@repo/ui/a11y-types';
import { WCAG } from '@repo/ui/wcag-criteria';

export default {
  component: 'breadcrumb',
  wcagCriteria: [WCAG.location, WCAG.infoAndRelationships, WCAG.nameRoleValue],
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
