/**
 * Windowed section editing — the uischema convention (feature 175).
 *
 * A definition author marks any layout element as editable by adding an `edit` key to its
 * `uischema.options`. The read-only surface then renders an Edit affordance beside that element's
 * heading, and the app opens a windowed edit flow scoped to the element and its children.
 *
 * Two modes, because a section is not always backed by schema data:
 *
 * ```jsonc
 * { "type": "Group", "label": "Service description",
 *   "options": { "edit": true } }                              // edit my own subtree
 *
 * { "type": "Group", "label": "Application methods",
 *   "options": { "edit": { "editor": "application-methods" } } } // mount a registered component
 * ```
 *
 * The affordance's own wording is authorable too — `"edit": { "actionLabel": "Manage methods" }` —
 * so a section whose window isn't really an "edit" can say what it actually does.
 * ```
 *
 * This module is PURE — no React, no `@jsonforms/*` import — so route files and navigation chrome
 * can resolve sections without pulling the (lazily-loaded) JSONForms chunk into the shell. The
 * renderers' side of the mechanism is the `EditActionProvider` port in `jsonforms-renderers`.
 */

/** The shape we inspect on a uischema element. Everything else on the element is passed through. */
export interface UiElement {
  type?: unknown;
  label?: unknown;
  scope?: unknown;
  elements?: unknown;
  options?: unknown;
  [key: string]: unknown;
}

/** A normalized `options.edit` value. */
export interface EditOption {
  /** A registered editor key, or `null` for subtree mode (`edit: true`). */
  editor: string | null;
  /** An author-supplied stable id. `null` means "derive one from the label". */
  id: string | null;
  /** Author-supplied wording for the affordance. `null` leaves it to the host's default. */
  actionLabel: string | null;
}

/** An editable element, with its id resolved against the whole uischema. */
export interface EditableSection {
  /** Unique within one uischema — the `$sectionId` route param. */
  id: string;
  label: string;
  /** `null` = edit `element`'s own children; otherwise the registered editor key. */
  editor: string | null;
  /** Author-supplied wording for the affordance, or `null` for the host's default. */
  actionLabel: string | null;
  element: UiElement;
}
