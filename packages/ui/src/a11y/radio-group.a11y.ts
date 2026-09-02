import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'radio-group',
  wcagCriteria: [
    WCAG.nameRoleValue,
    WCAG.keyboard,
    WCAG.infoAndRelationships,
    WCAG.errorIdentification,
  ],
  ariaPattern: {
    name: 'Radio Group',
    url: 'https://www.w3.org/WAI/ARIA/apg/patterns/radio/',
  },
  rules: [
    {
      id: 'no-manual-aria',
      description:
        'base-ui wires role="radiogroup" on RadioGroup and role="radio" + aria-checked on each RadioGroupItem automatically, plus arrow-key navigation between items — no manual aria props needed.',
      severity: 'forbidden',
    },
    {
      id: 'group-needs-a-name',
      description:
        'RadioGroup has no accessible name of its own. The forms renderer (enum-radio-control.tsx) wires aria-labelledby={`${id}-label`} pointing at the field\'s FieldLabel, plus aria-describedby via describedByIds, onto the group — callers outside that renderer must replicate this (aria-labelledby or aria-label) or the group announces as an unnamed "radio group".',
      severity: 'required',
    },
    {
      id: 'items-need-external-labels',
      description:
        'Each RadioGroupItem needs its own id plus a FieldLabel with a matching htmlFor — RadioGroupItem itself renders no visible text.',
      severity: 'required',
    },
    {
      id: 'group-level-invalid-styling-never-shows',
      description:
        "Both enum-radio-control.tsx and choice-control.tsx's radio branch set `aria-invalid` on the RadioGroup root, not on the individual RadioGroupItems. But radio-group.tsx's RadioGroup component has no `aria-invalid:` styling in its className at all — only RadioGroupItem does. The result: a required, unanswered radio group can be programmatically marked invalid (the attribute is genuinely present in the DOM) yet NO radio button in the group ever shows the destructive border/ring, because that styling is keyed off aria-invalid being present on the item itself, which it never is. The only visible signal a sighted user gets is the FieldError text below the group.",
      severity: 'required',
    },
  ],
  commonMisuses: [
    'Labelling only a visual heading above the radio group without wiring aria-labelledby or aria-label to the group itself — sighted users see the heading, but a screen reader user tabbing directly to the group hears an unnamed "radio group".',
  ],
  notes: [
    'enum-radio-control.tsx only sets aria-labelledby when a label is actually present (label ? `${id}-label` : undefined) — a radio group rendered without a label still needs its own aria-label if used outside that renderer.',
    "A native/ARIA radiogroup normally uses roving tabindex: only one radio item (the checked one, or the first if none is checked) is a tab stop, and arrow keys move both focus AND selection between items — the group container itself is never focused directly. Because of that, it is worth explicitly verifying with a real screen reader whether the group-level aria-invalid (see the rule above) is ever actually announced at all: since focus lands on an *item*, not the *group*, some screen reader/browser combinations will only speak the group's role/name/invalid-state once, on first entry, and never again as the user arrows between the individual radios within it.",
    "enum-radio-control.tsx and choice-control.tsx's radio branch are two independent implementations of the same idea (one dispatched by `options.format: 'radio'` on a plain enum schema, the other by the unified `format: 'choice'` + `display: 'radio'` uischema) — they duplicate the same aria-invalid/aria-labelledby/aria-describedby wiring rather than sharing it, so a future fix to one (e.g. the group-level-invalid-styling gap above) has to be applied to both or they'll silently diverge again.",
    "This design system's form runner (validationMode='ValidateAndShow', form-runner.tsx) shows validation errors from the very first render with no touched/blur gating — a required radio group with nothing selected reads as invalid (per the DOM attribute, even though it's not visibly styled) the instant the page loads, before the user has looked at it.",
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
