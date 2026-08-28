import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'dialog',
  wcagCriteria: [
    WCAG.nameRoleValue,
    WCAG.keyboard,
    WCAG.infoAndRelationships,
    WCAG.errorIdentification,
    WCAG.focusOrder,
  ],
  ariaPattern: {
    name: 'Dialog (Modal)',
    url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
  },
  rules: [
    {
      id: 'no-manual-aria-labelledby',
      description:
        "DialogPopup automatically wires aria-labelledby/aria-describedby to DialogTitle's/DialogDescription's own ids — always render a DialogTitle (and a DialogDescription when there's explanatory text) inside DialogContent so the dialog gets that name/description for free; don't set aria-label manually unless you're deliberately omitting a visible title.",
      severity: 'required',
    },
    {
      id: 'focus-trap-and-scroll-lock-are-default',
      description:
        "modal defaults to true — focus is trapped inside the popup, background scroll is locked, and outside pointer interactions are disabled. Only pass modal={false} (or 'trap-focus') when the rest of the page genuinely needs to stay interactive.",
      severity: 'required',
    },
    {
      id: 'close-button-when-modal',
      description:
        'When modal is true or "trap-focus", render a Dialog.Close inside the popup — DialogContent\'s showCloseButton (on by default) already does this with an sr-only "Close" label. Touch screen-reader users otherwise have no way to dismiss a focus-trapped dialog.',
      severity: 'required',
    },
    {
      id: 'per-field-errors-need-a-persistent-describedby-not-just-role-alert',
      description:
        'method-dialog.tsx\'s own LabeledInput and PhoneField (used inside MethodDialog\'s MethodForm step, NOT the shared ControlWrapper) render a bare `<FieldError errors={REQUIRED_ERROR} />` with no `id`, and their Input/PhoneInput never receive an `aria-describedby` at all. FieldError does render with role="alert" (field.tsx), so the "Required" text IS announced automatically the moment it first appears (e.g. right after clicking Save with that field empty) — but that\'s a one-shot interruption, not a persistent link: if the user later tabs back to that same still-invalid field, aria-invalid fires again but the reason ("Required") is never re-announced, since nothing connects the input to the alert text via aria-describedby. Compare to ControlWrapper\'s own FieldError (control-wrapper.tsx), which gets BOTH the role="alert" live announcement AND an explicit id wired into aria-describedby — this ad-hoc dialog form only got the first half of that fix.',
      severity: 'required',
    },
    {
      id: 'failed-save-fires-multiple-simultaneous-alerts-with-no-context',
      description:
        'MethodForm\'s handleSave flips `submitted = true` on click when ANY required key is missing, which can make several fields invalid at once (e.g. Label AND Value both empty) — each renders its own `role="alert"` "Required" FieldError simultaneously. Multiple assertive live regions firing at once typically queue or clip each other depending on the screen reader, and none of them says WHICH field is required since the message text is the same literal string (REQUIRED_ERROR) everywhere — a user could hear "Required... Required" with no way to tell, from the announcement alone, which fields need attention.',
      severity: 'recommended',
    },
    {
      id: 'no-focus-management-on-failed-save',
      description:
        "handleSave does not move focus to the first invalid field (or anywhere) when validation fails — a keyboard user's focus stays on the Save button they just clicked. Discovering which field(s) need fixing requires manually tabbing through the whole form and noticing the red borders/alert text one at a time, rather than being dropped directly onto the first problem.",
      severity: 'recommended',
    },
  ],
  commonMisuses: [
    "Passing showCloseButton={false} on DialogContent without providing any other Dialog.Close inside — leaves keyboard and touch screen-reader users with only Escape (or an outside click, when pointer dismissal isn't disabled) to close a modal dialog.",
    "Omitting DialogTitle to keep a dialog visually minimal — since aria-labelledby is wired automatically to the title's id, skipping it silently leaves the dialog with no accessible name at all, not just no visible heading.",
    "Driving a Dialog's `open` state entirely from external logic (as MethodDialog does — no DialogTrigger is ever rendered; the Add/Edit buttons in contact-methods-control.tsx set `dialog.open = true` directly) without separately verifying focus returns to the button that opened it once the dialog closes. base-ui's automatic return-focus-to-trigger behavior is normally tied to an actual Trigger component being part of the open/close cycle; bypassing Trigger entirely means this needs a manual check rather than being assumed to just work.",
  ],
  notes: [
    "MethodDialog is a two-step wizard rendered inside a SINGLE Dialog instance: step 1 (TypePicker, a grid of type buttons) swaps for step 2 (MethodForm, the field form) by changing `state.draft` from null to a value, without the Dialog itself closing/reopening. Nothing moves focus when that swap happens — the TypePicker button the user just clicked unmounts (it's replaced by MethodForm's fields), so focus most likely falls back to the dialog's popup element or the document body rather than landing on MethodForm's first field (Label). Worth a manual screen-reader/keyboard pass: a well-behaved multi-step dialog should move focus to the new step's first interactive element (or at minimum its heading) when the step changes.",
    'DialogDescription\'s text changes between the two MethodDialog steps ("Choose the kind of contact method to add." → "Enter the details for this contact method.") while DialogTitle stays fixed ("Add contact method" / "Edit contact method" — constant across both steps of a given add/edit flow). Since aria-describedby is wired once to the DialogDescription element\'s id, the accessible description DOES update correctly for a user who re-reads it, but nothing proactively announces that change to a screen reader user who already has focus elsewhere in the dialog when the step transitions.',
    'DialogOverlay is a `fixed inset-0` backdrop with no explicit aria-hidden coordination with page content behind it — base-ui\'s modal Dialog handles hiding the rest of the document from assistive tech (via aria-modal / inert) automatically while open, so this is expected to work without extra wiring, but it depends entirely on `modal` staying true (or "trap-focus") for any dialog that\'s meant to be modal; explicitly verify background content is actually inaccessible to AT if a dialog in this system is ever given `modal={false}`.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
