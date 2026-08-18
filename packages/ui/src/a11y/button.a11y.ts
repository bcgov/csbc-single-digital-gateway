import type { ComponentA11yMetadata } from './a11y-types';

export default {
  component: 'button',
  wcagCriteria: [
    { id: '4.1.2', name: 'Name, Role, Value', level: 'A' },
    { id: '2.1.1', name: 'Keyboard', level: 'A' },
    { id: '1.3.1', name: 'Info and Relationships', level: 'A' },
  ],
  rules: [
    {
      id: 'icon-only-needs-aria-label',
      description:
        "Icon-only buttons (size starting with 'icon') always need an aria-label — there's no visible text for assistive tech to read.",
      severity: 'required',
    },
    {
      id: 'use-native-disabled',
      description:
        'Use the native disabled prop rather than styling a button to look disabled — it also blocks pointer and keyboard interaction.',
      severity: 'required',
    },
    {
      id: 'buttonVariants-on-link-is-a-link',
      description:
        'When using buttonVariants on a Link or anchor, that element is not a real button — screen readers announce it as a link, which is correct since it navigates rather than performing an action.',
      severity: 'recommended',
    },
    {
      id: 'button-group-needs-aria-label',
      description:
        'ButtonGroup renders a div with role="group" but no accessible name of its own — always pass a descriptive aria-label (e.g. "Text formatting") so assistive tech can announce why these buttons are grouped.',
      severity: 'required',
    },
    {
      id: 'button-group-for-related-actions-only',
      description:
        'Use ButtonGroup to visually and semantically join a set of functionally related actions (e.g. a formatting toolbar, a segmented choice) — not just to control spacing between unrelated buttons. For plain layout spacing, use flex/grid utility classes instead.',
      severity: 'recommended',
    },
  ],
  commonMisuses: [],
  notes: [
    'ButtonGroup\'s orientation, alignment, and variant props are visual layout only — they change data-orientation/justify-*/rounded-*/border-* classes, not anything exposed to assistive tech. Screen readers announce the same grouped set of buttons regardless of orientation or whether variant is "default" (BCDS\'s plain grouping) or "joined" (shadcn\'s segmented look).',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
