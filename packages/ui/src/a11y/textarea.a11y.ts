import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'textarea',
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
        'Textarea renders a bare native <textarea> with no label of its own — always pair it with a Field/FieldLabel (htmlFor matching the textarea id) or ControlWrapper; Textarea never generates an accessible name by itself.',
      severity: 'required',
    },
    {
      id: 'aria-invalid-drives-both',
      description:
        'The destructive border/ring styling (aria-invalid:border-destructive aria-invalid:ring-2) is driven entirely by the aria-invalid attribute — set it whenever the field fails validation.',
      severity: 'required',
    },
    {
      id: 'wire-aria-describedby',
      description:
        "Wire aria-describedby to the field's description/error text ids (control-wrapper's describedByIds helper: `${id}-description` / `${id}-error`) so assistive tech announces hint and error text together with the label.",
      severity: 'recommended',
    },
    {
      id: 'maxlength-counter-is-visual-only',
      description:
        "When a schema sets maxLength, text-control.tsx renders a `{value.length}/{maxLength}` counter as a plain div below the Textarea — it is not wired to aria-describedby and has no aria-live region, so it is purely a sighted-user affordance. Don't rely on it as the field's only signal that the user is approaching the limit; the native maxLength attribute itself (also set on the textarea) still stops further typing, so the character budget is enforced either way, just not narrated.",
      severity: 'recommended',
    },
  ],
  commonMisuses: [
    "Using placeholder text as a substitute for a visible label — it disappears once the user starts typing and isn't reliably announced as a label by every screen reader.",
  ],
  notes: [
    'Textarea always sets resize-none and relies on field-sizing-content to grow with the content instead — some low-vision users rely on manually resizing a native textarea to see more of what they typed, so confirm the auto-grow behavior actually keeps pace with real content in practice.',
    "text-control.tsx's multiline branch (options.multi: true) reuses the exact same `shared` props object as the single-line Input branch — id, aria-invalid, aria-describedby, maxLength — so everything documented for Input's validation timing applies identically here: aria-invalid is computed fresh every render under the form runner's validationMode='ValidateAndShow', meaning a required-but-empty Textarea can read as invalid on its first render, and the invalid state can flip on every keystroke rather than settling once on blur.",
    'Unlike the single-line Input branch, the multiline branch does NOT go through ClearableInput — there is no clear ("×") affordance on a Textarea at all, mask input is never applied (masks are explicitly a single-line-only feature per text-control.tsx\'s comment), and the maxLength counter is the only extra piece of UI multiline gets. A long-text field (e.g. "additional comments") that a form builder marks required will show the same premature-invalid behavior noted for Input, but with no way to preview the counter until content is typed since field-sizing-content only reserves ~5 rows (min-h-[7.5rem]) before growing.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
