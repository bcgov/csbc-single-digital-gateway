import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'date-range-picker',
  wcagCriteria: [
    WCAG.nameRoleValue,
    WCAG.keyboard,
    WCAG.labelsOrInstructions,
    WCAG.errorIdentification,
  ],
  // No APG pattern cited — same reasoning as DatePicker: a masked text input plus a
  // non-modal calendar popover, not a focus-trapped dialog-based picker.
  rules: [
    {
      id: 'calendar-button-has-a-label',
      description:
        'The calendar-toggle button is icon-only — it already carries aria-label="Open calendar"; keep that label if you customize the InputGroupAddon.',
      severity: 'required',
    },
    {
      id: 'invalid-drives-aria-invalid',
      description:
        "Pass invalid (mapped to aria-invalid on the masked input) whenever the typed range fails to parse — the single text input has no other accessible signal that either half didn't parse.",
      severity: 'required',
    },
    {
      id: 'typed-input-is-the-primary-path',
      description:
        'Typing "mm/dd/yyyy - mm/dd/yyyy" parses both halves live, so a screen reader or keyboard-only user never has to open the two-month calendar popover to set a range.',
      severity: 'recommended',
    },
    {
      id: 'single-invalid-flag-cant-say-which-half-failed',
      description:
        'DateRangeControl passes exactly one `invalid={Boolean(errors)}` boolean covering the whole "start - end" text field, and — like DatePicker — nothing in date-range-control.tsx or DateRangePicker itself flags a half that fails to parse (`parseTypedRange` silently drops whichever half doesn\'t parse rather than surfacing an error). A screen reader user who mistypes only the END date has no way to learn, from either the ARIA state or any announced text, that specifically the second half of the value was rejected — the single input either reads as invalid (for an unrelated schema reason) or doesn\'t, with no half-specific diagnosis possible.',
      severity: 'required',
    },
  ],
  commonMisuses: [
    'Assuming there\'s a built-in clear control — unlike DatePicker, DateRangePicker has no clear ("×") button; if the field needs to be clearable, add one and give it its own aria-label.',
    'Treating a garbled typed range as "safely rejected" because the stored value doesn\'t change — DateRangePicker\'s onBlur handler resets its local text state to `rangeText(value)` (the last successfully committed range) the moment the field loses focus, exactly like DatePicker. A half-typed or malformed range silently reverts on blur with no explanation given to the user.',
  ],
  notes: [
    'The two-month calendar (numberOfMonths=2) only auto-closes once a genuine multi-day range is picked (from ≠ to) — a single click leaves the popover open so the user can still choose the end date; this is intentional, not stuck focus.',
    "Because `parseTypedRange` splits on the literal string `' - '` (RANGE_SEPARATOR), a screen reader user relying on the masked input's typing shortcuts has to reproduce that exact separator (including the surrounding spaces) between the two dates for the second half to parse at all — the input mask (`99/99/9999 - 99/99/9999`) enforces this visually/positionally for sighted mouse-and-keyboard users, but nothing narrates the required separator format to a screen reader user beyond the static placeholder text.",
    'captionLayout="dropdown" applies to BOTH months in the two-month view, so there are four native (invisibly-overlaid) month/year `<select>` elements in the popover at once — two per month — all sharing the calendar\'s general keyboard/focus-management notes from date-picker.a11y.ts. Tabbing through the open popover crosses all four before ever reaching a day cell.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
