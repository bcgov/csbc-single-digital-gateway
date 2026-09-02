import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'badge',
  wcagCriteria: [WCAG.useOfColor, WCAG.nonTextContent],
  rules: [
    {
      id: 'always-render-text',
      description:
        "Don't rely on color alone to carry status meaning — Badge always renders text content; if you go icon-only, add an aria-label.",
      severity: 'required',
    },
    {
      id: 'icons-are-decorative',
      description:
        'Icons inside a badge are decorative (the text already conveys the meaning) — always add aria-hidden={true}.',
      severity: 'required',
    },
  ],
  commonMisuses: [],
  notes: [],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
