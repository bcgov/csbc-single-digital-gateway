import { useState, type ReactNode } from 'react';
import { ContentJsonPanel } from './content-json-panel';
import { DocumentCanvas } from './document-canvas';
import type { DocumentRef, DocumentStore } from './document-store';
import { DocumentStudioEmpty } from './document-studio-empty';
import { DocumentStudioHeader } from './document-studio-header';
import { withVariant, type DocumentKind, type DocumentType } from './document-types';
import { NewDocumentDialog } from './new-document-dialog';
import { browserDocumentStore } from './stub-documents';
import { useDocumentStudio, type StudioStatus } from './use-document-studio';

export interface DocumentStudioProps {
  /** Open this document — its latest version unless `versionId` names one. Absent = a new document. */
  documentId?: string | undefined;
  versionId?: string | undefined;
  /** Preconfigure a NEW document. When either is missing, the New Document dialog asks. */
  kind?: DocumentKind | undefined;
  type?: DocumentType | undefined;
  /** Where documents load from and save to. Defaults to the browser stub store (SPIKE: no API yet). */
  store?: DocumentStore | undefined;
  /** Called after every save with the saved version — e.g. to put a new document's ids in the URL. */
  onSaved?: ((ref: DocumentRef) => void) | undefined;
  className?: string | undefined;
}

/**
 * Document Studio shell: a 36px header and footer around a flex-filling content area. The host sizes the
 * studio; it fills whatever box it is given.
 */
export function DocumentStudio({ store, className, ...props }: DocumentStudioProps) {
  const studio = useDocumentStudio({ ...props, store: store ?? browserDocumentStore() });
  const { draft } = studio;
  const [dialogOpen, setDialogOpen] = useState(
    props.documentId === undefined && (props.kind === undefined || props.type === undefined),
  );

  return (
    <div
      data-slot="document-studio"
      className={['flex size-full min-h-0 flex-col', className].filter(Boolean).join(' ')}
    >
      <DocumentStudioHeader
        document={draft}
        canSave={studio.dirty}
        saving={studio.saving}
        onSave={() => void studio.save()}
      />
      <main data-slot="document-studio-center" className="relative flex min-h-0 flex-1 flex-col">
        {draft === null ? (
          (STATUS_VIEWS[studio.status] ?? (
            <DocumentStudioEmpty onNewDocument={() => setDialogOpen(true)} />
          ))
        ) : (
          <>
            <DocumentCanvas
              uischema={draft.content.variants.default}
              schema={draft.content.schema}
              onChange={(uischema) => studio.setContent(withVariant(draft.content, uischema))}
            />
            <ContentJsonPanel content={draft.content} />
          </>
        )}
      </main>
      <StudioFooter saveError={studio.saveError} />
      <NewDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kind={props.kind}
        type={props.type}
        onCreate={studio.start}
      />
    </div>
  );
}

/** What the content area shows, without a document, for statuses other than `new`. */
const STATUS_VIEWS: Partial<Record<StudioStatus, ReactNode>> = {
  loading: <StatusMessage>Loading document…</StatusMessage>,
  'not-found': <StatusMessage>Document not found.</StatusMessage>,
};

function StatusMessage({ children }: { children: ReactNode }) {
  return (
    <p className="m-auto text-sm text-muted-foreground" data-slot="document-studio-status">
      {children}
    </p>
  );
}

function StudioFooter({ saveError }: { saveError: string | null }) {
  return (
    <footer
      data-slot="document-studio-footer"
      className="flex h-9 shrink-0 items-center border-t border-border px-2 text-xs"
    >
      {saveError !== null && (
        <span role="alert" className="text-destructive">
          {saveError}
        </span>
      )}
    </footer>
  );
}
