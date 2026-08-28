import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'phone-input',
  wcagCriteria: [WCAG.nameRoleValue, WCAG.keyboard, WCAG.labelsOrInstructions, WCAG.statusMessages],
  rules: [
    {
      id: 'country-button-has-a-label',
      description:
        'The country-select trigger already carries aria-label="Select country" — necessary since it displays only a flag icon and a chevron, no text.',
      severity: 'required',
    },
    {
      id: 'invalid-and-describedby-reach-the-number-input-only',
      description:
        'aria-invalid and aria-describedby passed to PhoneInput are forwarded (via numberInputProps) onto the underlying number <input> only — the country-select button has no wiring to that same description/error text, so make sure the announced message reads correctly when heard right after the number field, without depending on the country button.',
      severity: 'required',
    },
    {
      id: 'country-search-input-has-no-accessible-name',
      description:
        "PhoneInput's country picker (CountrySelect) opens a Popover containing a cmdk-based Command, not the design system's own base-ui Combobox — a second, independent combobox implementation with its own ARIA wiring. cmdk's Command root always renders a visually-hidden <label> whose text is `label` or `aria-label` on the Command element, and its CommandInput's `aria-labelledby` points at that label's id UNCONDITIONALLY (this takes precedence over any placeholder). phone-input.tsx's `<Command>` usage passes neither `label` nor `aria-label`, so that hidden label renders empty — meaning the \"Search country...\" input's computed accessible name is empty, not \"Search country...\" (aria-labelledby wins over placeholder in name computation). This looks like a real bug: pass `label=\"Search country\"` (or `aria-label`) to the `<Command>` element in phone-input.tsx.",
      severity: 'required',
    },
    {
      id: 'empty-country-search-result-is-not-announced',
      description:
        'cmdk\'s CommandEmpty renders with `role="presentation"` (verified in node_modules/cmdk — explicitly the opposite of a live region), unlike this design system\'s own Combobox, whose ComboboxEmpty explicitly sets role="status". Typing a search that matches no country in PhoneInput\'s country picker will NOT be automatically announced to a screen reader user the way the design system\'s other search-to-filter widgets (Combobox, used e.g. for address country/province) are — the "No country found." text just silently appears in the DOM.',
      severity: 'recommended',
    },
  ],
  commonMisuses: [
    "Assuming PhoneInput has a single accessible name — it is actually two adjacent controls (a country-select button and a number text input); a field-level FieldLabel wired through ControlWrapper labels the number input only, since PhoneInput's id prop is forwarded to that input, not the country button.",
    "Assuming the country picker behaves like the rest of the form system's Combobox (base-ui, role=\"status\" empty state, aria-invalid styling hooks) just because it looks similar — it's a completely separate library (cmdk) wrapped by the shared `Command` primitive, with its own ARIA implementation and its own gaps; don't extrapolate combobox.a11y.ts's guarantees onto it.",
  ],
  notes: [
    'cmdk\'s CommandInput independently sets its own `role="combobox"`, `aria-expanded="true"`, `aria-controls`, and `aria-autocomplete="list"` — structurally similar to base-ui\'s Combobox pattern, but a different implementation with different edge-case behavior (e.g. the accessible-name and empty-state gaps noted above). Don\'t assume fixes or guarantees made in the base-ui Combobox wrapper (packages/ui/src/components/ui/combobox.tsx) apply here.',
    "The country list button toggles a Popover (non-modal, base-ui) containing the Command search — same non-modal-popover focus/Escape behavior documented for DatePicker's calendar applies here: Escape and outside clicks close it, but focus is not trapped inside while open.",
    'formatPhone() (used for read-only display elsewhere in the app) falls back to the raw E.164 string when RPNInput.formatPhoneNumber() returns falsy — so a screen reader reading a malformed/unparseable stored phone number in a read-only view hears the raw "+1XXXXXXXXXX" digit string with no formatting pauses, rather than a natural "national format" reading. Not this component\'s editable path, but worth knowing if auditing the read-only counterpart.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
