import type { CapabilityMap, StudioDocument } from '@repo/forms';
import { FormRunner } from '@repo/forms/runner';
import { CapabilityProvider, FormStudio } from '@repo/forms/studio';
import { toast } from '@repo/ui/sonner';

/**
 * Doc 209 rules 16-17: the studio refuses some edits — an edge re-point that would duplicate a branch, close a
 * cycle or point a node at itself — and says why through this. A module const, not an inline arrow: the studio
 * reads it through a ref, and a new identity each render is the trap doc 200 rule 4b records.
 */
const notify = (message: string) => toast(message);

/**
 * Doc 218 rule 9: a disabled runner still takes `data`/`onChange`, so a host hands it exactly this. Module consts,
 * because a disabled runner cannot produce a change and a fresh `{}` each render would churn JSONForms for nothing.
 */
const NO_ANSWERS: Record<string, unknown> = Object.freeze({});
const noop = () => {};

export interface VersionContentProps {
  /** The version's content, already narrowed by `studioDocumentOf`; `null` when it could not be. */
  document: StudioDocument | null;
  /** Whether this version may be authored — a draft, plus whatever scope rule the host adds. */
  editable: boolean;
  /** Doc 218 rules 1-2: the studio's baseline on mount, then every edit. Never called while read-only. */
  onDocumentChange: (document: StudioDocument) => void;
  /**
   * Doc 221: the map of the template GOVERNING this document — what its owner may do. Distinct from
   * `capabilities` below, which is the map being AUTHORED on a template. A document is governed and
   * authors nothing; a template authors and is ungoverned. Absent means ungoverned, and the studio
   * then offers every affordance exactly as it does today.
   */
  governedBy?: CapabilityMap | undefined;
  /**
   * Doc 220: the capability map, on a TEMPLATE. Passing it — even as `{}` — is what gives the studio
   * its Editor Capabilities section; omit it and the studio never offers one.
   *
   * The `?? {}` belongs to the CALLER, not here: only the template page knows that its documents are
   * templates whose permissions are authorable, and a stored template that has no map yet must still
   * be able to grow one. The service-agreement page passes nothing at all.
   */
  capabilities?: CapabilityMap | undefined;
}

/**
 * A document version's `content`: authored in the **Form Studio** when it is editable, read in a **disabled
 * FormRunner** when it is not (doc 218). Shared by the admin template detail page and the service-agreement
 * detail page, which differ only in what makes a version editable.
 *
 * **The caller must `key` this by version id** (doc 218 rule 12). That is what makes seeding by props safe: the
 * studio re-seeds on a REFERENTIAL change of `schema`/`uischema`, so the refetch after a save would otherwise
 * clear its element ids and selection mid-edit. Remounting per version sidesteps that entirely.
 */
export function VersionContent({
  document,
  editable,
  onDocumentChange,
  capabilities,
  governedBy,
}: VersionContentProps) {
  // Rule 13: a row written before this feature came from a free-form JSON editor and could hold anything, so a
  // document that cannot be opened says so rather than being spread into a component's props.
  if (document === null) {
    return (
      <p role="alert" className="p-6 text-sm text-muted-foreground">
        This version’s content isn’t a form document, so it can’t be opened here.
      </p>
    );
  }
  if (editable) {
    // Rule 14: no `onSaveDocument` — that would render a second Save button inside the studio, and only the host
    // page knows about versions, publishing and 409s.
    return (
      // Doc 221: the GOVERNING map is a PROVIDER, never a document half — emitting it through
      // `onDocumentChange` would make this page save the template's capabilities into the document.
      <CapabilityProvider value={governedBy ?? null}>
        <FormStudio
          schema={document.schema}
          uischema={document.uischema}
          {...(capabilities === undefined ? {} : { capabilities })}
          onDocumentChange={onDocumentChange}
          onNotice={notify}
        />
      </CapabilityProvider>
    );
  }
  return (
    <FormRunner
      disabled
      schema={document.schema}
      uischema={document.uischema}
      data={NO_ANSWERS}
      onChange={noop}
    />
  );
}
