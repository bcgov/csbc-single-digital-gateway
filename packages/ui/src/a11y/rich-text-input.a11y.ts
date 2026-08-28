import type { ComponentA11yMetadata } from './a11y-types';
import { WCAG } from './wcag-criteria';

export default {
  component: 'rich-text-input',
  wcagCriteria: [WCAG.nameRoleValue, WCAG.keyboard, WCAG.labelsOrInstructions],
  rules: [
    {
      id: 'contenteditable-needs-aria-label',
      description:
        "The editable region is a contenteditable div with role=\"textbox\" (Lexical's ContentEditable) — a native <label for> can never target it, so the aria-label prop is the field's ONLY possible accessible name. Callers must always pass the field's label text as aria-label; ControlWrapper's FieldLabel alone can't supply it, since a <label for> pointing at this element has no effect.",
      severity: 'required',
    },
    {
      id: 'toolbar-role-and-label',
      description:
        'The formatting toolbar wraps its buttons in a role="toolbar" container with aria-label="Formatting" — every button inside (Bold, Italic, Heading 1, etc.) is icon-only and already carries its own aria-label.',
      severity: 'required',
    },
    {
      id: 'link-prompt-fallback',
      description:
        "The Link toolbar button opens a native window.prompt() for the URL — that's keyboard- and screen-reader-accessible (it's native browser UI), but is a stopgap; any future popover-based URL editor needs to preserve at least this level of accessibility.",
      severity: 'recommended',
    },
    {
      id: 'suppressed-label-leaves-the-editor-fully-unnamed',
      description:
        "rich-text-control.tsx only forwards aria-label when `typeof label === 'string' && label` is truthy — if a form builder suppresses the visible label (uischema `label: false`) or a schema/uischema authors an empty label string, the ContentEditable gets NO aria-label at all. Because a rich-text field can never fall back to a native `<label for>` (see the rule above), this specific control has no other path to an accessible name — a label-suppressed rich-text field is completely unnamed to assistive tech, which is a worse outcome than suppressing the label on any of the other 14 primitives here (they at least retain the possibility of an htmlFor-based label elsewhere).",
      severity: 'required',
    },
  ],
  commonMisuses: [
    "Rendering RichTextInput through ControlWrapper without also passing the label text as aria-label — ControlWrapper's FieldLabel has htmlFor={id}, but a contenteditable div can't be targeted by a native label's for attribute, so the visible label and the editor's accessible name silently disconnect unless aria-label is passed too.",
    "Suppressing the field's label at the uischema level (a legitimate, supported JSONForms pattern elsewhere, e.g. when a heading already visually introduces the field) — for RichTextInput specifically this doesn't just remove a visual label, it removes the field's only possible accessible name (see the rule above). Treat a rich-text field's label as non-optional even when the design calls for hiding it visually (use an sr-only label text passed as aria-label instead of suppressing it outright).",
  ],
  notes: [
    'The toolbar sets role="toolbar" and a group aria-label, but each button remains its own tab stop rather than the single-tab-stop, arrow-key-navigated model the ARIA-APG Toolbar pattern describes — keyboard users tab through every button individually instead of arrowing between them.',
    "None of the toolbar buttons (Bold, Italic, Underline, Heading 1/2/3, Bullet list, Numbered list, Link) expose whether their format is currently active for the selection — no aria-pressed, and richTextTheme (packages/ui/src/inputs/rich-text/shared.ts) only styles rendered CONTENT (paragraph/heading/list/text/link classes), not the toolbar buttons themselves. A screen reader user with their cursor inside bold text gets no signal from the Bold button that bold is already on; a sighted user gets no visual highlight either, since nothing in the toolbar's own styling reflects selection state — clicking Bold while already inside bold text presumably toggles it off, but there's no way to know that in advance from the UI.",
    "The two `aria-invalid` attributes — one on the outer wrapping div, one on the inner ContentEditable — serve different purposes and both are needed: the outer div's is a pure CSS hook (its className defines the `aria-invalid:border-destructive` styling, and only elements the attribute is actually set on respond to that Tailwind variant), while the ContentEditable's is the one that actually carries ARIA semantics to assistive tech (it's the element with role=\"textbox\"). Removing either one independently would silently break only half of the invalid-state behavior — the border styling (if removed from the div) or the AT announcement (if removed from the ContentEditable) — without the other half visibly failing.",
    "RichTextInput's `initialConfig` only seeds Lexical's `editorState` when `value.root` exists, deliberately treating an empty `{}` (a schema default with no real editor state) as a blank editor rather than crashing — worth knowing if you're debugging why a default-seeded rich-text field sometimes starts blank instead of at its authored default: the default has to be a REAL SerializedEditorState (with a root node), not just `{}` or a plain string.",
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
