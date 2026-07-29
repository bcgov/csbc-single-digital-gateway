import type { ComponentA11yMetadata } from './a11y-types';

export default {
  component: 'card',
  wcagCriteria: [
    { id: '1.1.1', name: 'Non-text Content', level: 'A' },
    { id: '2.4.4', name: 'Link Purpose (In Context)', level: 'A' },
  ],
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
