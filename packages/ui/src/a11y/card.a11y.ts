import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'card',
  wcagCriteria: [WCAG.nonTextContent, WCAG.linkPurposeInContext],
  rules: [
    {
      id: 'decorative-icons-hidden',
      description: 'Always add aria-hidden={true} to decorative icons.',
      severity: 'required',
    },
    {
      id: 'card-action-avatar-hidden-in-link',
      description:
        'Add aria-hidden={true} to the CardAction containing an avatar or icon when the card is inside a <Link> — prevents initials being read as link text.',
      severity: 'required',
    },
    {
      id: 'inline-title-link-visible-focus',
      description: 'Inline title links need hover:underline to be accessible on keyboard.',
      severity: 'required',
    },
    {
      id: 'equal-height-in-link-grid',
      description:
        'Add h-full on Card when it is inside a <Link> inside a grid — required for equal-height rows.',
      severity: 'recommended',
    },
  ],
  commonMisuses: [],
  notes: [],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
