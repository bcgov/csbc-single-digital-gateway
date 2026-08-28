import type { ComponentA11yMetadata } from '@repo/ui/a11y-types';
import { WCAG } from '@repo/ui/wcag-criteria';

export default {
  component: 'status-banner',
  wcagCriteria: [WCAG.useOfColor, WCAG.nonTextContent],
  rules: [
    {
      id: 'status-icon-hidden',
      description:
        "The status icon is decorative (the title and description already convey the meaning) — it's always rendered with aria-hidden={true}.",
      severity: 'required',
    },
    {
      id: 'always-render-title-text',
      description: "Don't rely on tone/color alone — every banner always renders a text title.",
      severity: 'required',
    },
  ],
  commonMisuses: [],
  notes: [],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
