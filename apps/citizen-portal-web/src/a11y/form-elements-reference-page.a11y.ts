import type { ComponentA11yMetadata } from '@repo/ui/a11y-types';
import { WCAG } from '@repo/ui/wcag-criteria';

// Pattern page, backed by @repo/react's JsonForms renderers, not a single @repo/ui component.
//
// This sidecar's scope is deliberately narrow: the /dev/form-elements page now renders each
// individual @repo/ui component's own sidecar inline per section (e.g. @repo/ui/field's
// packages/ui/src/a11y/field.a11y.ts covers the FieldLabel/FieldDescription/FieldError wrapper
// every control is built on — read it for the wrapper/error-state findings, not duplicated here).
// What belongs HERE is genuinely cross-cutting content: the page-wide uischema gotcha, and
// dedicated coverage for the three composite jsonforms controls (choice, address,
// contact-methods) that have no single @repo/ui-level primitive of their own to hang a sidecar
// off, because they're not single reusable primitives — they're compositions of several.
export default {
  component: 'form-elements',
  wcagCriteria: [
    WCAG.labelsOrInstructions,
    WCAG.nameRoleValue,
    WCAG.errorIdentification,
    WCAG.infoAndRelationships,
    WCAG.headingsAndLabels,
  ],
  rules: [
    {
      id: 'uischema-label-required',
      description:
        'Labels and descriptions come from the uischema label and schema description — the renderers wire these to the input via ControlWrapper, so a missing label means a missing accessible name.',
      severity: 'required',
    },
    {
      id: 'address-subfield-errors-should-be-linked',
      description:
        "AddressControl's per-sub-field errors are visual-only (see notes) — they should be linked to " +
        "their input via id + aria-describedby the same way ControlWrapper's describedByIds convention " +
        'links the top-level description/error, rather than relying on aria-invalid alone.',
      severity: 'recommended',
    },
    {
      id: 'contact-methods-table-needs-accessible-name',
      description:
        "ContactMethodsControl's table heading is visual-only (see notes) — the <h3> should get an id " +
        'and the Table should get a matching aria-labelledby (or equivalent aria-label) so the table ' +
        "itself carries the field's accessible name, not just its visually adjacent heading.",
      severity: 'recommended',
    },
  ],
  commonMisuses: [
    "A typo'd or mismatched options.format string (e.g. 'phone' misspelled) fails silently — JSON Forms' rank-based dispatch just falls through to the generic text/number/boolean renderer instead of erroring, so the wrong control renders with no warning.",
    "Assuming AddressControl's per-sub-field aria-invalid means the error TEXT is also announced — " +
      'aria-invalid={true} is wired per sub-field (SubField/ClearableInput), but the error message itself ' +
      '(rendered as a plain <p> next to the input in SubField) has no id and is never referenced by the ' +
      "input's aria-describedby, so a screen reader announces 'invalid' without saying why.",
    "Assuming ContactMethodsControl's <h3> heading gives the table (or the field as a whole) an " +
      "accessible name just because it's visually adjacent — ControlWrapper is called with label={false} " +
      'here specifically because the heading is rendered by hand, but nothing links that heading to the ' +
      '<Table> element itself (no id/aria-labelledby), so the association only exists visually.',
  ],
  notes: [
    "Every control's focusable element now gets aria-describedby wired to its description/error text via ControlWrapper's describedByIds helper (`${id}-description` / `${id}-error`), and radio-groups/checkbox-groups get aria-labelledby (and role=\"group\" for checkbox-groups) on their container so the group itself has an accessible name. A manual keyboard-and-screen-reader walkthrough of the generated controls still hasn't been done — only the ARIA wiring has been verified.",
    "Cross-reference: @repo/ui/field's sidecar (packages/ui/src/a11y/field.a11y.ts) documents the " +
      'shared Field/FieldLabel/FieldDescription/FieldError wrapper every control below is built on — ' +
      'the unconditional role="group" on single-input fields, the describedByIds wiring convention (and ' +
      "the fact that ControlWrapper does NOT wire it onto a control's children automatically), the " +
      'role="alert" mount/unmount timing concern, and the per-keystroke validation/aria-invalid timing ' +
      'concern. Those apply to every control on this page, including the three below, and are not ' +
      'repeated here.',
    'choice-control.tsx (packages/react/src/jsonforms-renderers/controls/choice/choice-control.tsx) — ' +
      'the unified control for options.display: "select" | "radio" | "checkboxes". Each variant does ' +
      'correctly inherit its underlying primitive\'s accessibility: "radio" wires aria-labelledby/' +
      'aria-describedby onto RadioGroup (role="radiogroup" from @repo/ui) with labelFor={false} on ' +
      'ControlWrapper; "checkboxes" renders its own role="group" div with the same aria-labelledby/' +
      'aria-describedby wiring; "select" uses ControlWrapper\'s normal single-input path with the label ' +
      'wired via htmlFor to the Select trigger. All three announce "required" identically and by the ' +
      "SAME mechanism — ControlWrapper appends a literal ' *' onto the visible label/legend text " +
      '(FieldLabel) — none of the three sets aria-required or the native HTML required attribute on the ' +
      'underlying RadioGroup/checkbox-group/Select. This is consistent across variants (no ' +
      'variant-specific regression), but it means "required" is only conveyed by that literal asterisk ' +
      'character in the accessible name/description for all three, not a dedicated ARIA property.',
    'address-control.tsx (packages/react/src/jsonforms-renderers/controls/address/address-control.tsx) ' +
      'renders its own hand-rolled <fieldset> instead of going through ControlWrapper. Confirmed still ' +
      'wired: the <fieldset> carries aria-describedby={describedByIds(baseId, { description, errors })}, ' +
      'and when present, the description renders as <p id={`${baseId}-description`}> and the top-level ' +
      'error as <p id={`${baseId}-error`}> — so the object-level description/error IS correctly linked ' +
      'to the fieldset. However, the PER-SUB-FIELD errors are a separate, more granular story: SubField ' +
      "(same file) renders each sub-field's required-validation message as a plain " +
      '<p className="text-sm text-destructive">{error}</p> with no id, and the sub-field\'s own input ' +
      '(ClearableInput/Combobox) sets aria-invalid={meta(key).error !== undefined} but never ' +
      'aria-describedby pointing at that <p>. Confirmed gap: per-sub-field errors are visually adjacent ' +
      'only, not programmatically linked — a screen reader hears the sub-field is invalid but not why.',
    'contact-methods-control.tsx ' +
      '(packages/react/src/jsonforms-renderers/controls/contact-methods/contact-methods-control.tsx) ' +
      'renders a Table of existing methods plus an "Add Contact Method" button that opens ' +
      'method-dialog.tsx. Confirmed: every icon-only row action button (Move up, Move down, Edit, ' +
      'Delete) has an explicit aria-label; the "Add Contact Method" button needs none since it has its ' +
      'own visible text (the plus icon is aria-hidden). Confirmed gap: ControlWrapper is called with ' +
      'label={false} and the field name is instead rendered as a plain manual ' +
      '<h3>{heading}</h3> — that heading has no id, and the following <Table> is rendered with no ' +
      "aria-labelledby/aria-label at all, so the table's accessible name/description is not " +
      "programmatically tied to the field's label, only visually adjacent to it.",
    'method-dialog.tsx focus-return: MethodDialog is a controlled Base UI Dialog (open={state.open}) ' +
      'with no <DialogTrigger> — it\'s opened by plain onClick handlers on the "Add Contact Method" and ' +
      'per-row "Edit" buttons that call setState directly. Neither DialogContent (packages/ui/src/' +
      "components/ui/dialog.tsx) nor MethodDialog passes initialFocus/finalFocus. Per Base UI's own " +
      'DialogPopup types (node_modules/@base-ui/react/dialog/popup/DialogPopup.d.ts), the default ' +
      'finalFocus behavior is "trigger or previously focused element" — since there\'s no DialogTrigger ' +
      'here, this falls back to whatever element had focus when the dialog opened, i.e. the Add/Edit ' +
      'button that was clicked. Confirmed this applies uniformly to BOTH close paths on this page: ' +
      'dismissing via Cancel/the X button (DialogClose) and a successful Save (setDialog(CLOSED) in ' +
      'save()) — neither path sets its own focus target, so both fall through to the same Base UI ' +
      'default and correctly return focus to the button that opened the dialog.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
