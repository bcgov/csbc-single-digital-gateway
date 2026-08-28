import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'slider',
  wcagCriteria: [WCAG.nameRoleValue, WCAG.keyboard, WCAG.focusVisible, WCAG.errorIdentification],
  ariaPattern: {
    name: 'Slider',
    url: 'https://www.w3.org/WAI/ARIA/apg/patterns/slider/',
  },
  rules: [
    {
      id: 'no-manual-aria-value',
      description:
        'base-ui\'s Slider wires role="slider" plus aria-valuemin/aria-valuemax/aria-valuenow on each Thumb automatically from min/max/value — no manual aria props needed.',
      severity: 'forbidden',
    },
    {
      id: 'each-thumb-needs-a-name',
      description:
        'When rendering more than one thumb (a range slider), give each Thumb its own aria-label (e.g. "Minimum price", "Maximum price") — otherwise screen readers announce every thumb identically and users can\'t tell them apart.',
      severity: 'required',
    },
    {
      id: 'aria-valuetext-for-units',
      description:
        'Add aria-valuetext when the raw number isn\'t self-explanatory on its own (e.g. "$50", "3 days") so assistive tech announces the unit, not just a bare number.',
      severity: 'recommended',
    },
    {
      id: 'wire-invalid-state-yourself',
      description:
        'Neither slider-control.tsx nor the Slider primitive itself ever sets aria-invalid — slider-control.tsx passes id, value, min/max/step, disabled and aria-describedby to Slider, but never `aria-invalid={Boolean(errors)}` the way every other renderer in this system does, and Slider\'s own className (unlike Input/Checkbox/Select/Switch/RadioGroupItem) has no `aria-invalid:` Tailwind variant at all — so even if a caller added the prop by hand there is no destructive-border/ring styling defined to respond to it. If a numeric range field needs a min/max validation error surfaced (e.g. a schema minimum/maximum on a slider-backed number), the Thumb itself gives a screen reader user no "invalid" signal whatsoever; only the ControlWrapper\'s FieldError text (a role="alert" div) below the slider announces it, and only at the moment it first appears, not when focus later returns to the Thumb.',
      severity: 'required',
    },
  ],
  commonMisuses: [
    "Relying on the indicator's fill color alone to distinguish the selected range from the rest of the track — the value/aria-valuetext already carries that information for non-visual users, so make sure it's actually set.",
    "Authoring a schema minimum/maximum on a uischema.options.slider field and assuming the Slider will visually/programmatically flag an out-of-range value the way a number Input does — it currently can't (see the wire-invalid-state-yourself rule above), so an invalid slider value is effectively silent at the widget level.",
  ],
  notes: [
    'If neither value nor defaultValue is passed, Slider renders two thumbs spanning [min, max] rather than one — pass an explicit single-element value/defaultValue for a plain single-thumb slider.',
    'slider-control.tsx renders the live numeric value as a plain `<span>{value}</span>` beside the track, with no aria-live region — a sighted user watching the number tick up while dragging gets instant visual feedback, but a screen reader user\'s only announcement of the current value comes from the Thumb\'s own role="slider" aria-valuenow (spoken as focus moves the thumb via keyboard, NOT while dragging with a pointer, and not from the adjacent span at all, since it carries no live-region semantics).',
    "slider-control.tsx always renders exactly one Thumb (`value={typeof data === 'number' ? data : min}`, and `onValueChange` unwraps an array to its first element) — the multi-thumb range-slider case documented in the rules above (each-thumb-needs-a-name) doesn't currently arise through this JSONForms control; it only matters for other direct uses of the bare Slider component.",
    "schema.multipleOf becomes the Slider's `step`; when it is omitted, the Slider has no explicit step and defaults to whatever base-ui's Slider treats as its default step. Keyboard arrow-key increments will match whatever that default is, which may not line up with the granularity a form builder actually intends (e.g. a 0–100 slider without multipleOf lets keyboard users land on every integer, while a builder who only tested with the pointer might not notice).",
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
