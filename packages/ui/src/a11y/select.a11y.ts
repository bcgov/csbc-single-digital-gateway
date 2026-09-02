import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'select',
  wcagCriteria: [
    WCAG.nameRoleValue,
    WCAG.keyboard,
    WCAG.labelsOrInstructions,
    WCAG.errorIdentification,
  ],
  ariaPattern: {
    name: 'Combobox (Select-Only)',
    url: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/',
  },
  rules: [
    {
      id: 'no-manual-aria',
      description:
        'base-ui wires the full select-only combobox pattern automatically: SelectTrigger gets role="combobox" + aria-haspopup="listbox" + aria-expanded + aria-controls, the popup\'s list gets role="listbox", and SelectItem gets role="option" — no manual aria props needed on any of these.',
      severity: 'forbidden',
    },
    {
      id: 'trigger-needs-a-name',
      description:
        "SelectTrigger has no text of its own beyond SelectValue's placeholder/selected label — pair it with a FieldLabel (htmlFor matching the trigger id) or an aria-label when there's no visible field label (e.g. TimePicker's inline Hour/Minute/AM-or-PM triggers).",
      severity: 'required',
    },
    {
      id: 'placeholder-not-a-label',
      description:
        "SelectValue's placeholder text disappears once a value is chosen — don't rely on it as the field's only accessible name.",
      severity: 'recommended',
    },
    {
      id: 'multi-select-needs-a-trigger-id-too',
      description:
        "choice-control.tsx's `display: 'select', multiple: true` branch renders a multi-select Select. It gets aria-invalid and aria-describedby wired on the SelectTrigger exactly like the single-select case, so nothing extra is needed there — but confirm base-ui's multi-select mode sets aria-multiselectable on the listbox popup (SelectContent) since that's what tells assistive tech to expect more than one selected option rather than treating extra selections as replacing the prior one.",
      severity: 'recommended',
    },
  ],
  commonMisuses: [
    'Reaching for Select when users need to filter or search a long option list by typing — Select implements the select-only combobox pattern (no typeahead beyond native first-letter jump); use Combobox instead for searchable lists.',
  ],
  notes: [
    "Every enum-family renderer (enum-control.tsx, oneof-enum-control.tsx, and choice-control.tsx's select branch) computes `aria-invalid={Boolean(errors)}` fresh on every render under the form runner's validationMode='ValidateAndShow' — a required-but-unselected Select can read as invalid on its first render, before the user has opened it once.",
    "choice-control.tsx's multi-select branch renders the joined selected labels (`list.map(labelForValue).join(', ')`) inside SelectValue, but SelectTrigger's CSS clamps that text to one line (`*:data-[slot=select-value]:line-clamp-1`). This clamp is purely visual — the full joined string stays in the DOM and therefore in the accessible name — so a sighted user sees \"Option A, Option B, …\" truncated with an ellipsis while a screen reader announces every selected option in full. Worth knowing when comparing what a sighted QA pass sees against what an AT user actually hears; they're not the same information.",
    "TimePicker (time-picker.tsx) composes three of these Select triggers in a row (Hour/Minute/AM-or-PM). Only the Hour trigger receives the `id` prop passed into TimePicker — the Minute and AM/PM triggers get no `id` at all (not even a generated one), only their fixed aria-label. That's enough for an accessible name, but it means anything that looks a Select up by DOM id (rather than accessible name) will only ever find the Hour trigger.",
    "TimePicker's Minute select has 60 zero-padded options ('00'..'59') and Hour has 12 ('1'..'12') — both rely on base-ui's built-in typeahead (type digits to jump to a matching option) rather than any custom keyboard handling; a keyboard user who knows to type rather than arrow through 59 options gets a much faster path, but nothing in the UI surfaces that shortcut, so it's effectively undiscoverable without prior familiarity with native/ARIA select typeahead conventions.",
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
