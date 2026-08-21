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
export interface SectionEditorProps {
  section: EditableSection;
  /** The viewed version's full schema — the editor scopes it itself if it needs to. */
  schema: Record<string, unknown>;
  serviceId: string;
  version: ServiceVersion;
  /** Close the window. Editors call this after a successful save. */
  onClose: () => void;
}

export const SECTION_EDITORS: Record<string, ComponentType<SectionEditorProps>> = {};
