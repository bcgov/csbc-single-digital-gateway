import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'date-picker',
  wcagCriteria: [
    WCAG.nameRoleValue,
    WCAG.keyboard,
    WCAG.labelsOrInstructions,
    WCAG.errorIdentification,
  ],
  // No APG pattern cited: this is a masked text input paired with a non-modal calendar
  // popover (base-ui Popover, role="dialog" but no focus trap) — not the focus-trapped,
  // grid-navigable modal the APG "Date Picker Dialog" example assumes, and typing is the
  // primary path rather than the popover.
  rules: [
    {
      id: 'clear-and-calendar-buttons-have-labels',
      description:
        'The clear ("×") and calendar-toggle buttons are icon-only — both already carry an aria-label ("Clear" / "Open calendar"); keep those labels if you customize the InputGroupAddon.',
      severity: 'required',
    },
    {
      id: 'invalid-drives-aria-invalid',
      description:
        "Pass invalid (mapped to aria-invalid on the masked input) whenever the typed value fails validation — the text input has no other accessible signal that what was typed didn't parse.",
      severity: 'required',
    },
    {
      id: 'typed-input-is-the-primary-path',
      description:
        'The calendar popover is a convenience, not the only path — typing is masked to MM/dd/yyyy and parses live, so a screen reader or keyboard-only user never has to open the popover to set a date.',
      severity: 'recommended',
    },
    {
      id: 'unparseable-typed-text-gets-no-error-at-all',
      description:
        'date-control.tsx only ever passes `invalid={Boolean(errors)}`, where `errors` comes exclusively from Ajv validating the already-committed ISO value. Unlike number-control.tsx (which merges a client-side over-precision check into its own error string), nothing in date-control.tsx or DatePicker itself ever flags a typed string that fails `parseTypedDate` — `onType` simply never calls `onChange` when parsing fails, so the stored schema value doesn\'t change and, if the field wasn\'t already invalid for some other reason (e.g. required-and-empty), aria-invalid stays false. Typing "13/45/2026" produces zero visual or programmatic error feedback of any kind.',
      severity: 'required',
    },
  ],
  commonMisuses: [
    "Assuming the calendar popover traps focus like a modal — it's a base-ui Popover (role=\"dialog\", non-modal); outside clicks and Escape close it, but focus isn't forced into the grid, so don't test it with modal-dialog assumptions.",
    'Treating a garbled typed date as "safely rejected" because the stored value doesn\'t change — DatePicker\'s onBlur handler resets its local text state to `displayValue(value)` (the last successfully committed date, or empty) the moment the field loses focus. A user who types an unparseable date and tabs away sees/hears their typed text silently disappear and replaced with nothing, with no error message explaining why — this is worth a manual check with a screen reader, since it reads as data loss with no cause given.',
  ],
  notes: [
    "The popover's calendar (day buttons, month/year dropdowns) is react-day-picker's own default keyboard and focus-management implementation — this wrapper doesn't add ARIA to it.",
    'captionLayout="dropdown" (what this wrapper always passes to Calendar) renders the month and year captions as real, natively-operable `<select>` elements absolutely positioned and made invisible (`bg-popover opacity-0`) over the styled caption text (calendar.tsx\'s `dropdown` className) — despite looking like plain bold text with a chevron, the month/year picker is a genuine native select underneath, fully keyboard- and screen-reader-operable without any custom ARIA. Don\'t mistake it for inert decoration when reviewing the calendar visually.',
    'CalendarDayButton (calendar.tsx) imperatively calls `.focus()` on the currently-focused day whenever react-day-picker\'s `modifiers.focused` changes — this is what makes arrow-key navigation between days work (react-day-picker manages a roving "focused day" in its own state; the wrapper is responsible for actually moving DOM focus to match it). If a future refactor changes how DayButton is composed, losing this effect would silently break keyboard navigation within the grid while everything still looked correct visually.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
