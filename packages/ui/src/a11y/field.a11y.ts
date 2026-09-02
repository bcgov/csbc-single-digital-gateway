import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'field',
  wcagCriteria: [
    WCAG.infoAndRelationships,
    WCAG.errorIdentification,
    WCAG.labelsOrInstructions,
    WCAG.nameRoleValue,
    WCAG.statusMessages,
    WCAG.focusOrder,
  ],
  rules: [
    {
      id: 'wire-aria-describedby-manually',
      description:
        'ControlWrapper (packages/react/src/jsonforms-renderers/util/control-wrapper.tsx) assigns ' +
        'id={`${id}-description`} / id={`${id}-error`} to FieldDescription/FieldError (and ' +
        'id={`${id}-label`} to FieldLabel) — but it never touches its `children`. Every control is ' +
        'responsible for calling the exported describedByIds(id, { description, errors }) helper and ' +
        "putting the result on its OWN real focusable element's aria-describedby. Field/FieldDescription/" +
        'FieldError render no aria-describedby link themselves.',
      severity: 'required',
    },
    {
      id: 'group-role-not-a-grouping-mechanism-for-single-inputs',
      description:
        'Field (field.tsx) hardcodes role="group" on its root div unconditionally — for every ' +
        'orientation and every instance, including a single `<input>` field that already has its own ' +
        "label via htmlFor and needs no group semantics. Only build on that role='group' as meaningful " +
        "grouping when there's genuinely no single focusable owner of the label (ControlWrapper's " +
        'labelFor={false} path — radio-group/checkbox-group in choice-control.tsx). For an ordinary ' +
        'single-input field, treat the group role as unavoidable primitive overhead, not a feature.',
      severity: 'recommended',
    },
    {
      id: 'validate-on-blur-not-every-keystroke',
      description:
        'FieldError renders role="alert" only while there\'s error content (returns null otherwise), ' +
        "so the alert div mounts/unmounts as validation flips. Controls read JSONForms' `errors` prop, " +
        'which is recomputed against the live ajv schema on every `handleChange` call — and ' +
        "address-control.tsx reads `ctx.core?.validationMode ?? 'ValidateAndShow'` confirming the " +
        'renderer defaults to showing validation immediately. Once a field is touched and invalid, an ' +
        "onChange fired per keystroke (e.g. text-control.tsx's `commit` on every `onChange`) recomputes " +
        "`errors` and re-renders FieldError's text on every keystroke, which — if the DOM node is freshly " +
        'mounted or its text content mutates while already present — makes an assertive role="alert" ' +
        "announce on every character typed. That's a well-known anti-pattern (interrupts the user's own " +
        'typing/screen-reader echo). Prefer validating/announcing on blur or debouncing rather than on ' +
        "every keystroke for assertive error alerts. Not exhaustively confirmed against every control's " +
        'exact re-render path — but the mechanism (immediate ValidateAndShow + per-keystroke handleChange ' +
        '+ unconditional role="alert") is present and worth a real screen-reader spot check.',
      severity: 'recommended',
    },
  ],
  commonMisuses: [
    'Adding a new control under packages/react/src/jsonforms-renderers/controls/* that renders ' +
      'description/errors via FieldDescription/FieldError but never calls describedByIds(...) to wire ' +
      'aria-describedby onto its own input — the text renders visually but is silently unlinked from ' +
      'the control for assistive tech. Nothing in TypeScript or lint catches this; it only shows up as a ' +
      'missing association in a screen reader or an axe "aria-describedby value must be an ID" style check.',
    'Reading Field\'s automatic role="group" as evidence that a set of fields is meaningfully grouped — ' +
      'it wraps EVERY Field instance regardless of orientation or content, including a single labelled ' +
      'input, so a long form of simple text fields wraps each one in its own (usually unnamed) ARIA ' +
      'group. Some screen readers announce "group... group... group..." on entry/exit for each one, ' +
      'which is noise rather than useful grouping semantics — a real grouped set of related fields should ' +
      'use FieldSet + FieldLegend (or a group with an explicit aria-label/aria-labelledby) instead.',
  ],
  notes: [
    'describedByIds(id, { description, errors }) (control-wrapper.tsx) builds `${id}-description` and/or ' +
      '`${id}-error` and joins them space-separated — exactly the ids ControlWrapper assigns as the ' +
      'literal `id` on FieldDescription/FieldError when they render. This is the deliberate wiring ' +
      'convention every control must replicate on its own focusable element(s); see the ' +
      'wire-aria-describedby-manually rule above.',
    "aria-invalid on each control's underlying input is driven straight from `Boolean(errors)`, " +
      'recomputed on every render — the same timing concern as the role="alert" rule above, but distinct: ' +
      'here the visual+programmatic invalid state (not just the error text announcement) can flip on ' +
      'before the user has finished entering a valid value, e.g. typing an email address shows invalid ' +
      'on every character until "@" plus a domain are present.',
    'FieldError\'s role="alert" firing reliably depends on the assistive technology AND on whether React ' +
      'reconciliation actually inserts a fresh DOM node vs. reuses one with mutated text — role="alert" is ' +
      'a live region that browsers/AT are expected to announce on insertion or content mutation, but this ' +
      'is not something to assume correct from the role alone; it should be spot-checked with a real ' +
      "screen reader against the field's actual re-render behavior.",
    'Horizontal orientation DOM order was checked against both controlPosition values used in the ' +
      'renderers: boolean-control.tsx (checkbox) uses the default controlPosition="left" — ' +
      'ControlWrapper renders {children}{content}, i.e. checkbox then label/description/error. ' +
      'boolean-toggle-control.tsx (switch) uses controlPosition="right" — ControlWrapper renders ' +
      "{content}{children}, i.e. label/description/error then switch. In both cases fieldVariants' " +
      'horizontal class (field.tsx) is a plain `flex-row` with no `order`/`flex-row-reverse` overrides, so ' +
      'DOM order and visual/reading order match for both configurations — no WCAG 1.3.2/2.4.3 mismatch ' +
      'found between visual and tab order for either controlPosition.',
    'FieldSet and FieldLegend are exported from field.tsx but, as of this audit, are not imported ' +
      'anywhere in packages/react/src or any app under apps/*/src — confirmed via a repo-wide grep. ' +
      'They are currently unused scaffolding, not wired into any grouped-field pattern. Notably, ' +
      'address-control.tsx — the one composite control that genuinely needs fieldset/legend semantics — ' +
      'hand-rolls its own <fieldset><legend> rather than using FieldSet/FieldLegend, so adopting them ' +
      'there (or in any future grouped-field control) is an open opportunity, not a regression.',
    'FieldContent (field.tsx) is only meaningful in the horizontal layout: ControlWrapper wraps the ' +
      'label + description + error in a FieldContent column so they stack (label, then description, then ' +
      'error) beside the control rather than running inline with it — `gap-1 leading-normal` on that ' +
      'wrapper is what makes the description/error text wrap onto its own line under the label. In the ' +
      'vertical (default) orientation ControlWrapper does not use FieldContent at all; label/children/' +
      'description/error are direct children of Field instead.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
