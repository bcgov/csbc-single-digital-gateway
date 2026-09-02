import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'combobox',
  wcagCriteria: [
    WCAG.nameRoleValue,
    WCAG.keyboard,
    WCAG.labelsOrInstructions,
    WCAG.errorIdentification,
  ],
  ariaPattern: {
    name: 'Combobox',
    url: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/',
  },
  rules: [
    {
      id: 'no-manual-aria',
      description:
        'base-ui wires the full editable-combobox pattern automatically on ComboboxInput — role="combobox", aria-expanded, aria-haspopup="listbox", aria-controls, and aria-autocomplete — plus role="listbox"/"option" on ComboboxList/ComboboxItem — no manual aria props needed on any of these.',
      severity: 'forbidden',
    },
    {
      id: 'needs-external-label',
      description:
        'ComboboxInput has no visible label of its own — always pair it with a FieldLabel (htmlFor matching the input id) via Field/ControlWrapper, e.g. for the address country/province search use.',
      severity: 'required',
    },
    {
      id: 'empty-state-is-a-status',
      description:
        'ComboboxEmpty already renders with role="status" — keep its text meaningful (e.g. "No country found.") since it is the only feedback a screen reader user gets when a search matches nothing.',
      severity: 'recommended',
    },
    {
      id: 'function-child-is-required-for-real-filtering',
      description:
        'ComboboxList only filters to the typed query when its children is a FUNCTION (per-item render callback) — base-ui renders the pre-filtered set through that callback. address-control.tsx\'s GeoBody deliberately uses `{(name: string) => <ComboboxItem>...}` rather than a static `.map()` over the full items array (its own inline comment calls this out: "a manual .map is not filtered"). Rendering a static list of ComboboxItems instead breaks the entire premise of a searchable field: the listbox stops narrowing as the user types, silently contradicting the `aria-autocomplete="list"` semantics base-ui already declared on the input, which tells assistive tech to expect the option set to track what was typed.',
      severity: 'required',
    },
    {
      id: 'per-field-error-text-needs-its-own-id-and-describedby',
      description:
        'address-control.tsx\'s SubField wrapper (used around the Combobox for country and province) renders its own inline error paragraph — `<p className="text-sm text-destructive">{error}</p>` — with NO id, and the Combobox\'s ComboboxInput only ever receives `aria-invalid`, never an `aria-describedby` pointing at that paragraph. A screen reader user who tabs to an invalid country/province Combobox hears "invalid" (from aria-invalid) but never hears WHY ("This field is required") unless they separately discover the visually-adjacent paragraph by browsing. This is a real, fixable gap: give the SubField\'s error `<p>` a stable id (e.g. `${id}-error`) and wire it into ComboboxInput\'s aria-describedby the same way describedByIds does everywhere else in this system.',
      severity: 'required',
    },
  ],
  commonMisuses: [
    "Using Combobox for a small, fixed set of mutually exclusive options with no search need — that's Select's job (the select-only combobox pattern); reach for Combobox specifically when users benefit from typing to filter, like searching a country or province list.",
    "Copying address-control.tsx's SubField pattern (a hand-rolled Field + FieldLabel + inline error paragraph, bypassing ControlWrapper entirely) for a new composite control without also copying — or fixing — its missing aria-describedby wiring; the per-field error rule above is exactly this trap.",
  ],
  notes: [
    'ComboboxChips (the multi-select chip variant) wraps its chip row in role="toolbar" — each chip\'s remove button is a real tab stop inside that toolbar, so keyboard users can tab (not just arrow) directly to a specific chip\'s remove control.',
    "address-control.tsx's outer `<fieldset aria-describedby={describedByIds(baseId, { description, errors })}>` puts the field-level description/object-level error on the FIELDSET itself, not on any individual focusable sub-field (Combobox or otherwise). A `<fieldset>` is not itself a focusable/interactive element, so most screen readers never announce a fieldset's own aria-describedby as focus moves among its children — meaning the address control's top-level description text and object-level error message are effectively unreachable to a screen reader user navigating field-by-field through the country/province Comboboxes and the other address sub-fields. Only the legend (the visible label) and each sub-field's OWN error (see the rule above, itself incompletely wired) are what an AT user actually encounters.",
    "In address-control.tsx's GeoBody, choosing a new Country deliberately clears Province via `withCountry` (a province from the old country never applies to the new one) — but this reset is silent: there is no aria-live announcement telling a screen reader user that Province was just cleared as a side effect of their Country selection. A user who then tabs past Province without re-opening it may not realize it needs to be re-selected.",
    'There is no aria-live region anywhere in the Combobox implementation announcing the filtered result count as the user types (e.g. "3 results") — the only feedback beyond the (now-shorter) list of ComboboxItems themselves is the role="status" ComboboxEmpty text, and only once the count reaches exactly zero. A search that narrows from 195 countries to 2 without ever hitting zero gives a screen reader user no indication of how much the list has narrowed short of arrowing into it.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
