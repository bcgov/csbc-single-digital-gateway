/**
 * Doc 222: the studio canvas placeholders, in a module with NO React dependency.
 *
 * These are plain strings, but they are read from two places with opposite constraints. The
 * renderers that DRAW them are `.tsx`; the inspector field definitions that offer them as input
 * placeholders are consumed by `checkCapabilities`, which runs inside platform-api. Leaving the
 * constants in `form-renderer.tsx` / `service-renderer.tsx` would drag React — and `@repo/ui`, and
 * gridstack — into the Nest process through a single string import.
 *
 * Both renderers re-export these, so every existing call site keeps its import path; this module is
 * the one place they are declared.
 */

/** Doc 201 rule 11: what the studio canvas shows in place of an unwritten Form title. Never authored. */
export const FORM_TITLE_PLACEHOLDER = 'Untitled form';

/** Doc 201 rule 22: the same, for an unwritten description. Never authored, and never shown to a citizen. */
export const FORM_DESCRIPTION_PLACEHOLDER = 'Add a description...';

/** Doc 215 rule 7: the studio canvas placeholder for an unwritten Service title. Never authored. */
export const SERVICE_TITLE_PLACEHOLDER = 'Untitled service';
