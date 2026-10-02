import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { DeleteChoices } from './delete-gate';
import { DocumentCanvas } from './document-canvas';
import { DocumentInspector } from './document-inspector';
import { DocumentPalette } from './document-palette';
import type { DocumentRef, DocumentStore } from './document-store';
import { DocumentStudioEmpty } from './document-studio-empty';
import { DocumentStudioHeader } from './document-studio-header';
import { resolveFocus, type FocusState } from './form-focus';
import { withVariant, type DocumentKind, type DocumentType } from './document-types';
import { NewDocumentDialog } from './new-document-dialog';
import { removeElement } from './element-remove';
import { insertItem } from './palette-insert';
import { defaultPalette, uniqueItems, type PaletteResolver } from './palette-items';
import { SelectionBreadcrumbs } from './selection-breadcrumbs';
import { selectionPath, type PathSegment } from './selection-path';
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
  /**
   * What the Palette offers, decided from the open document's type, kind and content (doc 238 rule 1). Absent = every
   * studio renderer (`defaultPalette`). Its identity is a re-run signal: pass a stable function.
   */
  palette?: PaletteResolver | undefined;
  className?: string | undefined;
}

/**
 * Document Studio shell: a 36px header and footer around a flex-filling content area. The host sizes the
 * studio; it fills whatever box it is given.
 */
export function DocumentStudio({ store, className, palette, ...props }: DocumentStudioProps) {
  const studio = useDocumentStudio({ ...props, store: store ?? browserDocumentStore() });
  const { draft } = studio;
  const items = useMemo(
    () =>
      draft === null
        ? []
        : uniqueItems(
            (palette ?? defaultPalette)({
              type: draft.type,
              kind: draft.kind,
              content: draft.content,
            }),
          ),
    [palette, draft],
  );
  const { setContent } = studio;
  // A palette item placed on the page (doc 238 rules 14-16): created fresh, then applied with its schema properties.
  const insert = useCallback(
    (layoutId: string, index: number, itemId: string) => {
      const item = items.find((candidate) => candidate.id === itemId);
      if (draft === null || item === undefined) return;
      const next = insertItem(draft.content, layoutId, index, item.create());
      if (next !== draft.content) setContent(next);
    },
    [items, draft, setContent],
  );
  // A page element deleted through the gate (doc 242): removed with any schema property only it bound.
  const removeEl = useCallback(
    (elementId: string) => {
      if (draft === null) return;
      const next = removeElement(draft.content, elementId);
      if (next !== draft.content) setContent(next);
    },
    [draft, setContent],
  );
  const [dialogOpen, setDialogOpen] = useState(
    props.documentId === undefined && (props.kind === undefined || props.type === undefined),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Which collapsed panel is open, expanded — one at a time (doc 233 rule 14).
  const [expanded, setExpanded] = useState<'palette' | 'inspector' | null>(null);
  // Doc 234: Inspect bumps this to reveal the inspector. "Don't ask me again" lasts for this mount, remembered per
  // kind (doc 235 rule 13).
  const [inspectorReveal, setInspectorReveal] = useState(0);
  const [deleteChoices, setDeleteChoices] = useState<DeleteChoices>({});
  const variant = draft?.content.variants.default ?? null;
  const [focus, setFocus] = useDocumentFocus(
    draft?.ref?.documentId ?? (draft === null ? null : NEW),
    variant?.['type'],
  );
  const focusedId = variant === null ? null : resolveFocus(variant, focus);
  // Derived, so a deleted Form or another document simply stops being selected (doc 232 rule 5). With nothing
  // selected, a focused Form is selected by default (doc 233 rule 6).
  const path =
    variant === null
      ? null
      : (selectionPath(variant, selectedId) ?? selectionPath(variant, focusedId));
  const shownSelection = path?.at(-1)?.id ?? null;

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
        // A root Form's page has no flow to go Back to: its trailing + is the way out (doc 233 rule 9).
        onBack={
          focusedId === null || variant?.['type'] === 'Form' ? undefined : () => setFocus(null)
        }
      />
      {/* `@container/canvas`: the floating panels collapse by the canvas's width, not the window's (doc 233 rule 14). */}
      <main
        data-slot="document-studio-center"
        className="@container/canvas relative flex min-h-0 flex-1 flex-col"
      >
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
              selectedId={shownSelection}
              onSelect={setSelectedId}
              focusedId={focusedId}
              onFocus={(formId) => {
                setFocus(formId);
                setSelectedId(formId);
              }}
              onUnfocus={() => setFocus(null)}
              onInspect={(formId) => {
                setSelectedId(formId);
                setInspectorReveal((n) => n + 1);
              }}
              deleteChoices={deleteChoices}
              onRememberDelete={(kind, choice) =>
                setDeleteChoices((choices) => ({ ...choices, [kind]: choice }))
              }
              onInsert={insert}
              onRemoveElement={removeEl}
            />
            {focusedId !== null && (
              <DocumentPalette
                open={expanded === 'palette'}
                onOpenChange={(open) => setExpanded(open ? 'palette' : null)}
                items={items}
                // Click, Enter or Space appends to the end of the focused Form (doc 238 rule 16).
                onAppend={(itemId) => {
                  if (focusedId !== null) insert(focusedId, Infinity, itemId);
                }}
              />
            )}
            <DocumentInspector
              content={draft.content}
              open={expanded === 'inspector'}
              onOpenChange={(open) => setExpanded(open ? 'inspector' : null)}
              revealKey={inspectorReveal}
            />
          </>
        )}
      </main>
      <StudioFooter path={path} onSelect={setSelectedId} saveError={studio.saveError} />
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

/** The key of a document not saved yet. */
const NEW = '\u0000new';

/**
 * Focus, reset to `'default'` whenever another document opens (doc 233 rule 2) — but not when a new document is first
 * saved, which only gives the SAME document its id — and when the root turns from a Funnel into a Form (rule 10).
 */
function useDocumentFocus(documentKey: string | null, rootType: unknown) {
  const [focus, setFocus] = useState<FocusState>('default');
  const [openFor, setOpenFor] = useState(documentKey);
  const [rootWas, setRootWas] = useState(rootType);
  if (openFor !== documentKey) {
    setOpenFor(documentKey);
    if (openFor !== NEW) setFocus('default');
  }
  if (rootWas !== rootType) {
    setRootWas(rootType);
    // A Funnel left with one Form (a delete unwraps it) becomes a Form root: focus that Form, as if just opened (rule 10).
    if (rootWas === 'Funnel' && rootType === 'Form') setFocus('default');
  }
  return [focus, setFocus] as const;
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

function StudioFooter({
  path,
  onSelect,
  saveError,
}: {
  path: PathSegment[] | null;
  onSelect: (formId: string | null) => void;
  saveError: string | null;
}) {
  return (
    <footer
      data-slot="document-studio-footer"
      className="flex h-9 shrink-0 items-center gap-2 border-t border-border px-2 text-xs"
    >
      {path !== null && <SelectionBreadcrumbs segments={path} onSelect={onSelect} />}
      {saveError !== null && (
        <span role="alert" className="ml-auto text-destructive">
          {saveError}
        </span>
      )}
    </footer>
  );
}
