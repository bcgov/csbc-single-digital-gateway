import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'accordion',
  wcagCriteria: [WCAG.nameRoleValue, WCAG.keyboard],
  ariaPattern: {
    name: 'Accordion',
    url: 'https://www.w3.org/WAI/ARIA/apg/patterns/accordion/',
  },
  rules: [
    {
      id: 'no-manual-aria-expanded',
      description:
        "base-ui's Accordion wires up aria-expanded and panel roles automatically — no manual aria props needed on Trigger/Content.",
      severity: 'forbidden',
    },
    {
      id: 'group-values-lists-every-item',
      description:
        "AccordionGroup's values prop must list every item's value, or expand-all/collapse-all won't include items you forgot to list.",
      severity: 'required',
    },
  ],
  commonMisuses: [],
  notes: [],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
