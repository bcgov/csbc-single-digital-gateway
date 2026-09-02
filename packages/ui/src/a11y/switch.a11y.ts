import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'switch',
  wcagCriteria: [WCAG.nameRoleValue, WCAG.keyboard, WCAG.errorIdentification],
  ariaPattern: {
    name: 'Switch',
    url: 'https://www.w3.org/WAI/ARIA/apg/patterns/switch/',
  },
  rules: [
    {
      id: 'no-manual-aria-checked',
      description:
        'base-ui\'s Switch wires role="switch" and aria-checked automatically from its own checked state — never set aria-checked manually.',
      severity: 'forbidden',
    },
    {
      id: 'needs-external-label',
      description:
        'Switch renders no visible text of its own — always pair it with a FieldLabel whose htmlFor matches the switch id.',
      severity: 'required',
    },
    {
      id: 'sm-size-shrinks-the-hit-target',
      description:
        'The `size="sm"` variant renders a 14×24px control (`data-[size=sm]:h-[14px] data-[size=sm]:w-[24px]`) versus the default 20×40px — well under common target-size guidance (24×24 CSS px minimum). boolean-toggle-control.tsx always uses the default size (it never passes `size`), so this only matters if a caller reaches for `size="sm"` directly outside the JSONForms renderer; avoid it for anything a citizen has to tap on a touch device.',
      severity: 'recommended',
    },
  ],
  commonMisuses: [
    "Using Switch for a value that only takes effect on form submit — the switch role signals an immediate on/off effect to screen reader users (the same expectation as a native OS toggle), so a form field's boolean choice that isn't applied until submit is more accurately a Checkbox.",
  ],
  notes: [
    "boolean-toggle-control.tsx computes `aria-invalid={Boolean(errors)}` fresh on every render under the form runner's validationMode='ValidateAndShow' (no touched/blur gating) — same live-error timing as every other control in this system. Unlike Slider, Switch's own className DOES define `aria-invalid:border-destructive aria-invalid:ring-2`, so the wiring here is complete: a required-but-unset toggle both announces and visually reads as invalid immediately, including before the user has touched it.",
    'orientation="horizontal" controlPosition="right" (what boolean-toggle-control.tsx always passes) means the FieldLabel/description/error column renders BEFORE the Switch in DOM order, with the switch pushed to the far edge — so tab order and reading order both go label → description → error → switch, not switch-first the way Checkbox\'s horizontal-left layout does. Worth knowing if you\'re auditing tab order against a visual mock, since the two boolean controls in this system intentionally order their DOM differently.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
