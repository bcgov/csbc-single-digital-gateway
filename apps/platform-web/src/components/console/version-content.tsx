import type { DocumentContent } from '@repo/documents/content';
import { DocumentStudio, type DocumentKind, type DocumentType } from '@repo/documents/studio';

/** Doc 276: the template governing a document — its name for the studio's "Based on" badge, and its rules. */
export interface GoverningTemplate {
  name: string;
  capabilities: DocumentContent['capabilities'];
}

export interface VersionContentProps {
  /** The version's content, already narrowed by `documentContentOf`; `null` when it could not be. */
  document: DocumentContent | null;
  /** What the document is — the studio's palette, badges and template rules follow it. */
  kind: DocumentKind;
  type: DocumentType;
  /** Whether this version may be authored — a draft, plus whatever scope rule the host adds. */
  editable: boolean;
  /** Doc 218 rules 1-2 (kept by doc 276): the studio's baseline on mount, then every edit. */
  onDocumentChange: (document: DocumentContent) => void;
  /**
   * Doc 221: the template GOVERNING this document — what its owner may do. A document is governed and authors no
   * rules; a template authors its rules in `document.capabilities` and is ungoverned. Absent = ungoverned.
   */
  governedBy?: GoverningTemplate | undefined;
}

/**
 * A document version's content in the **Document Studio** (doc 276, replacing doc 218's Form Studio and disabled
 * FormRunner): host-controlled — this page fetches, saves, publishes and versions — and READ-ONLY (locked to
 * Preview) when the version may not be edited. Shared by the admin template page and the service-agreement page,
 * which differ only in what makes a version editable.
 *
 * **The caller must `key` this by version id**: the studio seeds from `document` once per mount, so a refetch after
 * a save (an equal document with a new identity) never re-seeds it and clears the author's ids and selection.
 */
export function VersionContent({
  document,
  kind,
  type,
  editable,
  onDocumentChange,
  governedBy,
}: VersionContentProps) {
  // Rule 13: a row in the old `{ schema, uischema }` shape, or written by hand, says so rather than being spread
  // into a component's props.
  if (document === null) {
    return (
      <p role="alert" className="p-6 text-sm text-muted-foreground">
        This version’s content isn’t a document the studio can open.
      </p>
    );
  }
  return (
    <DocumentStudio
      content={document}
      kind={kind}
      type={type}
      onContentChange={onDocumentChange}
      readOnly={!editable}
      {...(governedBy !== undefined && {
        governing: { name: governedBy.name, capabilities: governedBy.capabilities },
      })}
    />
  );
}

/**
 * Doc 276: the template a version is PINNED to, as the studio shows it — its name (the default variant's label) and its
 * rules. `undefined` = ungoverned: no pinned template, or one that authored no rules. Shared by the agreement and
 * service pages (doc 281), which both look it up in their detail's `definitions[templateVersionId]`.
 */
export function governingOf(
  definition:
    | { variants: Record<string, Record<string, unknown>>; capabilities?: unknown }
    | undefined,
): GoverningTemplate | undefined {
  if (definition?.capabilities === undefined) return undefined;
  const label = definition.variants['default']?.['label'];
  return {
    name: typeof label === 'string' && label.trim() !== '' ? label.trim() : 'Template',
    capabilities: definition.capabilities as GoverningTemplate['capabilities'],
  };
}
