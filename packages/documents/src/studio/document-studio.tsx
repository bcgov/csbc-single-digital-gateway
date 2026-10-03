import { useCallback, useMemo, useState } from 'react';
import type { DeleteChoices } from './delete-gate';
import { DocumentCanvas } from './document-canvas';
import { DocumentInspector } from './document-inspector';
import { DocumentPalette } from './document-palette';
import type { DocumentRef, DocumentStore } from './document-store';
import { DocumentStudioEmpty } from './document-studio-empty';
import { DocumentPreview } from './document-preview';
import { DocumentStudioHeader, type StudioMode } from './document-studio-header';
import { resolveFocus, type FocusState } from './form-focus';
import { withVariant, type DocumentKind, type DocumentType } from './document-types';
import { NewDocumentDialog } from './new-document-dialog';
import { copyElement } from './element-copy';
import { useOptionsEditor } from './options/use-options-editor';
import { removeElement } from './element-remove';
import { findById } from './element-ids';
import { appendTarget, insertItem } from './palette-insert';
import { defaultPalette, uniqueItems, type PaletteResolver } from './palette-items';
import { selectionPath } from './selection-path';
import { STATUS_VIEWS, StudioFooter } from './studio-footer';
import { browserDocumentStore } from './stub-documents';
import { useDocumentStudio } from './use-document-studio';

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
  // A page element copied from its action bar (doc 254 rule 6): the copy's id comes back so the page selects it.
  const copyEl = useCallback(
    (elementId: string) => {
      if (draft === null) return undefined;
      const result = copyElement(draft.content, elementId);
      if (result === undefined) return undefined;
      setContent(result.content);
      return result.copyId;
    },
    [draft, setContent],
  );
  const [dialogOpen, setDialogOpen] = useState(
    props.documentId === undefined && (props.kind === undefined || props.type === undefined),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The focused page's element selection, for a palette click (doc 238 rule 16b). Stale ids are tolerated.
  const [pageSelectedId, setPageSelectedId] = useState<string | null>(null);
  // Which collapsed panel is open, expanded — one at a time (doc 233 rule 14).
  const [expanded, setExpanded] = useState<'palette' | 'inspector' | null>(null);
  // Doc 234: Inspect bumps this to reveal the inspector. "Don't ask me again" lasts for this mount, remembered per
  // kind (doc 235 rule 13).
  const [inspectorReveal, setInspectorReveal] = useState(0);
  const [deleteChoices, setDeleteChoices] = useState<DeleteChoices>({});
  const variant = draft?.content.variants.default ?? null;
  const documentKey = draft?.ref?.documentId ?? (draft === null ? null : NEW);
  const [focus, setFocus] = useDocumentFocus(documentKey, variant?.['type']);
  const [mode, setMode] = useStudioMode(documentKey);
  const focusedId = variant === null ? null : resolveFocus(variant, focus);
  // Derived, so a deleted Form or another document simply stops being selected (doc 232 rule 5). With nothing
  // selected, a focused Form is selected by default (doc 233 rule 6).
  const path =
    variant === null
      ? null
      : (selectionPath(variant, selectedId) ?? selectionPath(variant, focusedId));
  const shownSelection = path?.at(-1)?.id ?? null;
  // The choice field whose options are being edited, and its dialog (doc 255).
  const options = useOptionsEditor({
    content: draft?.content ?? null,
    focusedId,
    formId: shownSelection,
    onContentChange: setContent,
  });

  return (
    <div
      data-slot="document-studio"
      className={['flex size-full min-h-0 flex-col', className].filter(Boolean).join(' ')}
    >
      <DocumentStudioHeader
        document={draft}
        mode={mode}
        onModeChange={setMode}
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
        ) : mode === 'preview' ? (
          <DocumentPreview content={draft.content} focusedId={focusedId} />
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
              onCopyElement={copyEl}
              onEditOptions={options.open}
              onPageSelect={setPageSelectedId}
            />
            {focusedId !== null && (
              <DocumentPalette
                open={expanded === 'palette'}
                onOpenChange={(open) => setExpanded(open ? 'palette' : null)}
                items={items}
                // Click, Enter or Space places by the page selection (doc 238 rule 16).
                onAppend={(itemId) => {
                  const form =
                    focusedId === null || variant === null
                      ? undefined
                      : findById(variant, focusedId);
                  if (form === undefined) return;
                  const { layoutId, index } = appendTarget(form, pageSelectedId);
                  insert(layoutId, index, itemId);
                }}
              />
            )}
            <DocumentInspector
              content={draft.content}
              onContentChange={setContent}
              pageSelectedId={pageSelectedId}
              focusedId={focusedId}
              formId={shownSelection}
              open={expanded === 'inspector'}
              onOpenChange={(open) => setExpanded(open ? 'inspector' : null)}
              revealKey={inspectorReveal}
              onEditOptions={options.open}
            />
            {options.dialog}
          </>
        )}
      </main>
      <StudioFooter
        // Preview selects nothing, so it shows no breadcrumbs (doc 247 rule 12).
        path={mode === 'preview' ? null : path}
        onSelect={setSelectedId}
        saveError={studio.saveError}
      />
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

/**
 * Edit | Preview (doc 247 rule 4): a document opens in Edit, and opening another resets to it — but not when a new
 * document is first saved, which only gives the SAME document its id.
 */
function useStudioMode(documentKey: string | null) {
  const [mode, setMode] = useState<StudioMode>('edit');
  const [openFor, setOpenFor] = useState(documentKey);
  if (openFor !== documentKey) {
    setOpenFor(documentKey);
    if (openFor !== NEW) setMode('edit');
  }
  return [mode, setMode] as const;
}
