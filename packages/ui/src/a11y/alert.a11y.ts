import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'alert',
  wcagCriteria: [WCAG.nonTextContent, WCAG.useOfColor, WCAG.nameRoleValue, WCAG.statusMessages],
  rules: [
    {
      id: 'role-note-default',
      description:
        'Alert renders role="note" by default. Override with "complementary", "status" or (sparingly) "alert" only when the message warrants it; a message that warrants none of these should be plain text, not an Alert.',
      severity: 'required',
    },
    {
      id: 'role-alert-sparingly',
      description:
        'role="alert" interrupts assistive tech immediately — reserve it for messages that need the user’s immediate attention.',
      severity: 'recommended',
    },
    {
      id: 'icon-decorative',
      description:
        'The variant icon is decorative (the title/description carry the meaning) — always aria-hidden={true}.',
      severity: 'required',
    },
    {
      id: 'icon-only-action-labelled',
      description:
        'An icon-only AlertAction button (e.g. dismiss) needs its own aria-label — there is no visible text for assistive tech to read.',
      severity: 'required',
    },
  ],
  commonMisuses: [
    'Relying on the variant’s color (icon, border, background) as the only signal — body text stays neutral across variants by design, so the copy itself must say what kind of message it is.',
  ],
  notes: [],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
