import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'checkbox',
  wcagCriteria: [
    WCAG.nameRoleValue,
    WCAG.keyboard,
    WCAG.infoAndRelationships,
    WCAG.errorIdentification,
  ],
  ariaPattern: {
    name: 'Checkbox',
    url: 'https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/',
  },
  rules: [
    {
      id: 'no-manual-aria-checked',
      description:
        'base-ui\'s Checkbox wires role="checkbox" and aria-checked automatically from its own checked state — never set aria-checked manually.',
      severity: 'forbidden',
    },
    {
      id: 'needs-external-label',
      description:
        'Checkbox renders no visible text of its own — always pair it with a FieldLabel whose htmlFor matches the checkbox id, the way multi-enum-control.tsx does for every checkbox-group option.',
      severity: 'required',
    },
    {
      id: 'group-invalid-state-must-be-wired-explicitly',
      description:
        'A checkbox-group\'s "invalid" signal has to be set by hand on the group container — and the two renderers that build a checkbox group in this system disagree on whether they do it. choice-control.tsx\'s `display: \'checkboxes\'` branch sets `aria-invalid={invalid}` on its role="group" wrapper div; multi-enum-control.tsx (the renderer for a plain array-of-enum schema, no `format: \'choice\'` authored) never sets aria-invalid anywhere — not on its role="group" div, not on any individual Checkbox — even though it receives `errors` and already wires aria-describedby from them. A required multi-select checkbox group left empty shows red FieldError text below it (via ControlWrapper) but the group and its checkboxes themselves never read as invalid to a screen reader.',
      severity: 'required',
    },
  ],
  commonMisuses: [
    'Wrapping a set of related checkboxes in a plain div without role="group" and aria-labelledby on the container — sighted users see a heading above the set, but a screen reader user tabbing into the group hears each checkbox in isolation, with no sense they belong together.',
    "Assuming a checkbox-group's invalid styling reaches individual checkboxes — even where the group container does get aria-invalid (choice-control.tsx's checkboxes branch), that attribute is never propagated down to the individual Checkbox items, and Checkbox's own aria-invalid CSS hooks (border-destructive, ring) only fire on the item itself. So even an author who wires the group correctly still gets a checkbox set with no per-item destructive styling — only the surrounding FieldError text signals the problem visually.",
  ],
  notes: [
    'There is no dedicated CheckboxGroup component in @repo/ui — a related set of checkboxes (e.g. a multi-select enum) must be wrapped by the caller in a container with role="group" and aria-labelledby (see packages/react/src/jsonforms-renderers/controls/multi-enum-control.tsx, which wires both onto its container div) or the set has no accessible group name.',
    'checkbox.tsx has a specific combined state style — `aria-invalid:aria-checked:border-primary` — that keeps the border primary-colored (not destructive-red) once a previously-invalid checkbox becomes checked, while the ring stays destructive. This only matters for a SINGLE required checkbox (boolean-control.tsx, e.g. "I agree to the terms") whose aria-invalid stays true until the surrounding form re-validates; it doesn\'t apply to checkbox-group items, which never receive aria-invalid at all (see the group-invalid rule above).',
    "boolean-control.tsx (the single required-checkbox case) correctly computes `aria-invalid={Boolean(errors)}` fresh every render under the form runner's validationMode='ValidateAndShow' — so a required, unchecked single checkbox can read as invalid on its very first render, before the user has interacted with it at all, exactly like the text/number controls.",
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
