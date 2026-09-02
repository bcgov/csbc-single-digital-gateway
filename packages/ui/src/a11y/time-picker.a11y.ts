import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'time-picker',
  wcagCriteria: [
    WCAG.nameRoleValue,
    WCAG.keyboard,
    WCAG.labelsOrInstructions,
    WCAG.errorIdentification,
  ],
  rules: [
    {
      id: 'hardcoded-labels-are-the-only-name',
      description:
        'The Hour/Minute/AM-or-PM Select triggers already carry aria-label ("Hour" / "Minute" / "AM or PM") — this is the ONLY accessible name each select ever gets, since there is no visible text label in the row (just "hh"/"mm" placeholders inside SelectValue). Do not remove these aria-labels when composing TimePicker into a larger field, or the selects go unnamed.',
      severity: 'required',
    },
    {
      id: 'separator-colon-hidden',
      description:
        'The literal ":" between the hour and minute selects is decorative — it is already aria-hidden.',
      severity: 'required',
    },
    {
      id: 'period-defaults-to-am-without-user-action',
      description:
        "TimePicker's local `period` state initializes to `'AM'` (`useState<Period>(parts.period ?? 'AM')`) rather than starting unset — so `compose24Hour` can succeed, and `onChange` fires, as soon as the user has touched ONLY Hour and Minute, silently carrying the never-explicitly-chosen 'AM' along with it. A user (sighted or not) who tabs Hour → Minute → moves on without ever opening the AM/PM select can submit a time that's 12 hours off from what they intended, with no validation error possible (the value is fully well-formed). This is worth flagging as a functional/UX issue with an accessibility angle: a screen reader user has no way to distinguish \"AM/PM defaulted, not yet reviewed\" from \"AM/PM deliberately confirmed\" — both announce identically as \"AM/PM, AM\".",
      severity: 'recommended',
    },
  ],
  commonMisuses: [
    'Treating TimePicker as one control for tab-order or testing purposes — it is three independent Select triggers; keyboard users tab through Hour → Minute → AM/PM separately, each announced by its own aria-label, not a single combined "time" field.',
  ],
  notes: [
    'Only the Hour trigger receives the id, aria-invalid, and aria-describedby passed into TimePicker — the Minute and AM/PM triggers receive aria-invalid but not aria-describedby, so a description or error message linked via aria-describedby is announced when focus lands on Hour but not necessarily when it lands on Minute or AM/PM.',
    "Hour's options ('1'..'12') never have a leading zero, but Minute's ('00'..'59') always do — so base-ui's built-in typeahead behaves asymmetrically between the two adjacent selects: typing \"1\" in Hour cycles 1/10/11/12, while typing \"1\" in Minute cycles 01/10-19 style matches starting from '01'. A keyboard user relying on typeahead across both fields in quick succession has to remember two different digit conventions for what looks like one continuous \"HH:MM\" control.",
    'All three selects independently call `onValueChange` → `commit`, and `commit` recomputes the FULL composed value from current local state each time — so selecting Hour, then Minute, then AM/PM fires `onChange` on the TimePicker THREE times as the value progressively completes (the first two calls emit `undefined` until all three parts are set, per `compose24Hour`\'s early return). Nothing about that is wrong, but it means TimePicker\'s onChange is not a single "final answer" callback — any code consuming it needs to tolerate repeated undefined-then-defined transitions rather than assuming one call equals one committed choice.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
