import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'dropdown-menu',
  wcagCriteria: [WCAG.keyboard, WCAG.nameRoleValue, WCAG.useOfColor, WCAG.linkPurposeInContext],
  ariaPattern: {
    name: 'Menu Button',
    url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/',
  },
  rules: [
    {
      id: 'roles-and-keys-built-in',
      description:
        'base-ui’s Menu wires up role="menu"/"menuitem" and arrow-key / Escape keyboard navigation automatically — don’t re-add them.',
      severity: 'required',
    },
    {
      id: 'icon-only-trigger-labelled',
      description:
        'An icon-only DropdownMenuTrigger (e.g. an overflow ⋯ button) always needs an aria-label.',
      severity: 'required',
    },
    {
      id: 'destructive-variant',
      description:
        'Use variant="destructive" on a destructive item rather than a hand-rolled text-destructive className — the variant also tints hover/focus and any icon — and keep clear label text, since color alone isn’t a reliable signal.',
      severity: 'recommended',
    },
    {
      id: 'links-only-for-navigation',
      description:
        'Only render an item as a <Link> (render prop) when it actually navigates; an action item rendered as a link with no destination is forbidden.',
      severity: 'forbidden',
    },
  ],
  commonMisuses: [
    'Destructive items that only set text color by hand (several in this app predate the variant prop).',
  ],
  notes: [],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
