import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'input',
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
        'Input renders a bare native <input> with no label of its own — always pair it with a Field/FieldLabel (htmlFor matching the input id) or ControlWrapper; Input never generates an accessible name by itself.',
      severity: 'required',
    },
    {
      id: 'aria-invalid-drives-both',
      description:
        'The destructive border/ring styling (aria-invalid:border-destructive aria-invalid:ring-2) is driven entirely by the aria-invalid attribute — set it whenever the field fails validation, so screen reader users get the same signal sighted users get from the red border, not just a visual change.',
      severity: 'required',
    },
    {
      id: 'wire-aria-describedby',
      description:
        "Wire aria-describedby to the field's description/error text ids (control-wrapper's describedByIds helper: `${id}-description` / `${id}-error`) so assistive tech announces hint and error text together with the label, not just whatever is visually nearby.",
      severity: 'recommended',
    },
    {
      id: 'clear-button-not-a-tiny-generic-target',
      description:
        'ClearableInput\'s clear button (used by TextControl and NumberControl for a plain single-line input) always announces as the bare word "Clear" — if you build a custom variant, keep that pattern consistent (an aria-label, not an icon with no text) rather than shipping an icon-only button with no name at all.',
      severity: 'required',
    },
  ],
  commonMisuses: [
    "Using placeholder text as a substitute for a visible label — it disappears once the user starts typing and isn't reliably announced as a label by every screen reader.",
  ],
  notes: [
    "The form runner drives JSONForms with validationMode='ValidateAndShow' (see form-runner.tsx) with no touched/blur gating — text-control.tsx computes `aria-invalid={Boolean(errors)}` fresh on every render, so a required-but-empty text field can already read as invalid on its very first render (before the user has typed anything), and the invalid state can flip mid-keystroke (e.g. a minLength or pattern check going from failing to passing) rather than only settling once on blur. Number-control.tsx layers a second, purely client-side check on top (its own `decimals` over-precision message merged into the same `errors` string) that updates on the same every-keystroke cadence, so a number field can show a decimals error the instant a value goes one digit too precise, before the user has finished typing.",
    'TextControl and NumberControl both wrap Input in ClearableInput (util/clearable-input.tsx), whose trailing "×" button only mounts once the field has a value and un-mounts the instant it is clicked (clearing the value flips `hasValue` to false, which removes the very button that was just activated) — no focus is explicitly redirected afterward, so a keyboard user clicking or Enter-activating "Clear" likely loses their focus position (falls back to the document body in most browsers) instead of landing back on the now-empty input. Worth a manual check with a screen reader before relying on it.',
    'Every ClearableInput clear button — across every single-line Input, NumberControl, and every free-text address sub-field (address-control.tsx\'s PlainBody) — carries the identical generic aria-label="Clear" with no field-specific text. A screen reader user browsing a form\'s buttons list (e.g. NVDA\'s Elements List, or VoiceOver\'s Rotor) on a page with several clearable fields sees an undifferentiated wall of "Clear" buttons and has no way to tell which one belongs to which field without also reading surrounding context.',
    '@repo/ui\'s Field primitive (field.tsx) wraps every control — including a bare Input — in a `role="group"` div. On most screen readers this is inert for a single simple control (no accessible name is set on the group, so nothing extra is announced), but it is worth knowing it is there if you ever see an unexpected "group" boundary announced while arrowing through a dense form in browse mode.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
