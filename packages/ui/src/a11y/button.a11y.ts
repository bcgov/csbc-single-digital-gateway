import type { ComponentA11yMetadata } from './a11y-types';

export default {
  component: 'button',
  wcagCriteria: [
    { id: '4.1.2', name: 'Name, Role, Value', level: 'A' },
    { id: '2.1.1', name: 'Keyboard', level: 'A' },
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
  ],
  commonMisuses: [],
  notes: [],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
