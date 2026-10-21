import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'number-input',
  wcagCriteria: [
    WCAG.nameRoleValue,
    WCAG.labelsOrInstructions,
    WCAG.infoAndRelationships,
    WCAG.errorIdentification,
  ],
  rules: [
    {
      id: 'needs-associated-label',
      description:
        'NumberInput renders no label of its own — pair it with a Field/FieldLabel whose htmlFor matches the id passed to NumberInput (Base UI forwards it from NumberField.Root to the <input>), or pass aria-label / aria-labelledby.',
      severity: 'required',
    },
    {
      id: 'aria-invalid-drives-both',
      description:
        'The destructive border/ring styling is driven entirely by the aria-invalid attribute (the same classes as Input) — set it whenever the value fails validation, so screen reader users get the same signal sighted users get from the red border.',
      severity: 'required',
    },
    {
      id: 'wire-aria-describedby',
      description:
        "Wire aria-describedby to the field's description/error text ids so assistive tech announces hint and error text (e.g. the allowed range) together with the label.",
      severity: 'recommended',
    },
  ],
  commonMisuses: [
    "Relying on a `format` (currency, percent, unit) to communicate what the number means — the symbol is part of the value text and isn't announced until the value is read, so name the unit in the label or description too.",
    "Using placeholder text as a substitute for a visible label — it disappears once the user starts typing and isn't reliably announced as a label by every screen reader.",
  ],
  notes: [
    'Base UI sets aria-roledescription="Number field" on the <input>, so screen readers announce "Number field" rather than "edit text"; the value is announced as its formatted string.',
    'There are no visible increment/decrement buttons: Arrow Up/Down step by `step` (Shift → largeStep, Alt → smallStep) and Home/End jump to min/max, so pointer-only users adjust the value by typing.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
