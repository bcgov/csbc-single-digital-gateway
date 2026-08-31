import type { ComponentType } from 'react';
import type { EditableSection } from '@repo/react/uischema-edit';
import type { ServiceVersion } from '@/lib/services';

/**
 * Registry of bespoke section editors (feature 175).
 *
 * A uischema element marked `options.edit: { editor: '<key>' }` mounts the component registered
 * under that key instead of having its editor derived from its own children. That mode exists
 * because a section is not always backed by schema data: the seeded Service type's *Eligibility
 * criteria*, *Application methods* and *Data & Privacy* Groups carry `elements: []` — they are
 * console-owned concerns backed by `document_references` and agreement refs, so there is no subtree
 * to render.
 *
 * `options.edit: true` (no key) is the other mode and needs no entry here — it falls back to
 * `SubtreeSectionEditor`.
 */
/**
 * URL-backed step control handed down by the page (feature 177).
 *
 * The page is the only part of this tree that knows about routes; an editor that has steps (today,
 * a flow-variant `Categorization`) receives the current one and a way to move, and decides for
 * itself what the address should say.
 */
export interface SectionStepControl {
  /** The step id in the URL, or `null` when the URL carries no step segment. */
  id: string | null;
  /** Navigate to a step. `undefined` clears the segment; `replace` is for silent corrections. */
  go: (stepId: string | undefined, options?: { replace?: boolean }) => void;
}

export interface SectionEditorProps {
  section: EditableSection;
  /** The viewed version's full schema — the editor scopes it itself if it needs to. */
  schema: Record<string, unknown>;
  serviceId: string;
  version: ServiceVersion;
  /** Close the window. Editors call this after a successful save. */
  onClose: () => void;
  /** The URL-backed step, for editors that have steps. Ignored by the ones that don't. */
  step?: SectionStepControl;
}

export const SECTION_EDITORS: Record<string, ComponentType<SectionEditorProps>> = {};
