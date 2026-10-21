import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'checkbox-group',
  wcagCriteria: [
    WCAG.nameRoleValue,
    WCAG.keyboard,
    WCAG.infoAndRelationships,
    WCAG.errorIdentification,
  ],
  ariaPattern: {
    name: 'Checkbox (grouped)',
    url: 'https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/',
  },
  rules: [
    {
      id: 'group-needs-a-name',
      description:
        'CheckboxGroup sets role="group" itself, but a group with no accessible name is announced as an unlabelled group. Pass aria-labelledby pointing at the visible label that heads the set — in a form control that is the field label\'s id, which ControlField hands its children as `labelId`.',
      severity: 'required',
    },
    {
      id: 'invalid-is-the-groups-job',
      description:
        "A checkbox group's invalid state belongs to the group, not to its items: pass `invalid` and the container gets aria-invalid. The individual Checkboxes never receive it, and their own aria-invalid styling (destructive border and ring) therefore never fires — which is correct, because a whole set being under-filled is not a fault of any one box. This component exists partly to make that one decision instead of leaving each caller to make it differently: before it, choice-control.tsx set aria-invalid on its wrapper while multi-enum-control.tsx set it nowhere, so a required, empty multi-select read as perfectly valid to a screen reader while showing red text.",
      severity: 'required',
    },
    {
      id: 'items-need-their-own-labels',
      description:
        'Each Checkbox in the group renders no visible text of its own — pair every one with a FieldLabel whose htmlFor matches that checkbox id. Naming the group does not name its items.',
      severity: 'required',
    },
    {
      id: 'no-manual-role-or-aria-checked',
      description:
        'Do not set role="group" or aria-checked by hand — CheckboxGroup sets the role and Base UI\'s Checkbox wires aria-checked from its own state.',
      severity: 'forbidden',
    },
  ],
  commonMisuses: [
    'Using a CheckboxGroup for a single yes/no answer. One checkbox is a boolean field and needs no group; the group is for choosing several from a fixed list.',
    "Expecting the group's aria-invalid to reach the items visually. It does not, by design — signal the problem with error text under the group (which ControlField already wires into aria-describedby), not by trying to redden every box.",
    'Holding non-string values. Base UI\'s group value is string[], so a caller whose options are numbers must convert at its own boundary and map back on change — storing "1" where the data model says 1 fails validation with a confusing message about allowed values rather than about types.',
  ],
  notes: [
    "Base UI propagates the group's `disabled` down to every item — the visible box gets aria-disabled and tabindex -1, and its hidden input gets the disabled attribute. Set it once on the group; setting it per item as well is noise.",
    'The group is a plain div with role="group", so it is not a tab stop and does not manage arrow-key navigation between items — unlike a radio group, every checkbox is its own tab stop, which is correct for a set where any combination is valid.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
