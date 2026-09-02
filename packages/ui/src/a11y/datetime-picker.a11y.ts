import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'datetime-picker',
  wcagCriteria: [
    WCAG.nameRoleValue,
    WCAG.keyboard,
    WCAG.infoAndRelationships,
    WCAG.errorIdentification,
  ],
  rules: [
    {
      id: 'label-covers-the-date-part-only',
      description:
        'The outer field\'s FieldLabel/htmlFor (wired via id) points only at the date input\'s underlying text field — the Hour/Minute/AM-or-PM selects carry their own fixed aria-label ("Hour"/"Minute"/"AM or PM") from TimePicker itself, not the field\'s own label text. A screen reader announces the field\'s label, then separately "Hour", "Minute", "AM or PM", rather than one connected name.',
      severity: 'required',
    },
    {
      id: 'invalid-and-describedby-forward-to-both-parts',
      description:
        'invalid and aria-describedby passed to DateTimePicker are forwarded to both the DatePicker and TimePicker sub-controls, so a validation error or description is reachable from either part — but it is the same message/id repeated on both, not two independent ones.',
      severity: 'required',
    },
    {
      id: 'time-picker-half-gets-no-id-at-all',
      description:
        'DateTimePicker forwards its own `id` prop only to the nested `<DatePicker id={id} .../>` — the nested `<TimePicker .../>` receives no `id` prop whatsoever (datetime-picker.tsx literally omits it). That means TimePicker\'s Hour SelectTrigger — the only one of the three time selects that would otherwise take an `id` — renders with no id attribute in the DOM at all inside a DateTimePicker. It still has an accessible name (the hardcoded aria-label="Hour"), so this isn\'t a naming bug, but any tooling or test that locates the control by id rather than role/name will only ever find the date half.',
      severity: 'recommended',
    },
  ],
  commonMisuses: [
    'Treating DateTimePicker as a single focusable control when checking tab order or label announcement — it is actually four separate focusable widgets (a masked date input, then three Select triggers) sharing one visual row; verify each is reachable and named on its own.',
  ],
  notes: [
    'Composite of DatePicker + TimePicker (see each of their own sidecars) — the date and time parts only combine into one emitted value once both are set; a screen reader user hears them as adjacent widgets, not one field with sub-parts.',
    'Every gap documented in date-picker.a11y.ts applies unmodified to the date half here — most notably that an unparseable typed date string gets no error feedback of any kind (invalid only reflects the schema-level `errors` DateTimeControl passes in, never a local parse failure) and silently reverts to the last committed value on blur.',
    'datetime-control.tsx passes the SAME `invalid`/`aria-describedby` value to both DatePicker and TimePicker, but the two sub-controls apply it differently: DatePicker puts aria-invalid/aria-describedby on its single masked text input, while TimePicker (per its own sidecar) puts aria-invalid on all three Select triggers but aria-describedby on the Hour trigger only. Net effect for a screen reader user tabbing straight through: date input (hears description/error) → Hour (hears description/error) → Minute (hears invalid state only, no description/error) → AM/PM (same as Minute) — an inconsistent announcement pattern across four consecutive stops in the same composite field.',
    'combineDateTime only emits a value once BOTH datePart and timePart are set — a citizen who fills in the date but not the time (or vice versa) has effectively entered nothing from the schema\'s point of view, with no partial-progress indicator; if the field is required, the schema-level "required" error is the only feedback that something is still missing, and it can\'t tell the user which of the two halves is the outstanding one.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
