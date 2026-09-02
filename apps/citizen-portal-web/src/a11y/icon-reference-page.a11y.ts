import type { ComponentA11yMetadata } from '@repo/ui/a11y-types';
import { WCAG } from '@repo/ui/wcag-criteria';

// Pattern page, not a single owning component — covers @mdi/react icon usage conventions.
export default {
  component: 'icons',
  wcagCriteria: [WCAG.nonTextContent],
  rules: [
    {
      id: 'decorative-icons-hidden',
      description:
        'Decorative icons (an icon next to text that already conveys the meaning) always need aria-hidden={true}.',
      severity: 'required',
    },
    {
      id: 'icon-only-label-on-control-not-icon',
      description:
        'An icon-only control (no visible text) needs an aria-label on the interactive element it sits inside (a button or link) — not on the icon itself.',
      severity: 'required',
    },
    {
      id: 'standalone-icon-title-description',
      description:
        "Icon's own title/description props are for a genuinely standalone, meaningful icon (rare here) — prefer aria-label on the surrounding control instead where one exists.",
      severity: 'recommended',
    },
  ],
  commonMisuses: [],
  notes: [],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
