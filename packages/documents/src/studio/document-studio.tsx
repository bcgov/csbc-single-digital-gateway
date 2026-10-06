import { useMemo, useState } from 'react';
import type { DeleteChoices } from './delete-gate';
import { DocumentCanvas } from './document-canvas';
import { DocumentInspector } from './document-inspector';
import { DocumentPalette } from './document-palette';
import type { DocumentRef, DocumentStore } from './document-store';
import { DocumentStudioEmpty } from './document-studio-empty';
import { DocumentPreview } from './document-preview';
import { DocumentStudioHeader, type StudioMode } from './document-studio-header';
import { resolveFocus, type FocusState } from './form-focus';
import {
  DEFAULT_VARIANT,
  variantOf,
  withVariant,
  type DocumentKind,
  type DocumentType,
} from './document-types';
import { NewDocumentDialog } from './new-document-dialog';
import { toast } from '@repo/ui/sonner';
import { LOCKED } from './capabilities/governance';
import { useOptionsEditor } from './options/use-options-editor';
import { useRuleEditor } from './rules/use-rule-editor';
import { findById } from './element-ids';
import { appendTarget } from './palette-insert';
import { defaultPalette, uniqueItems, type PaletteResolver } from './palette-items';
import { STATUS_VIEWS, StudioFooter } from './studio-footer';
import { browserDocumentStore } from './stub-documents';
import { useDocumentStudio } from './use-document-studio';
import { selectionPaths, useStudioSelection } from './use-studio-selection';
import { useStudioEdits, useTemplates } from './use-studio-edits';
import { useActiveVariant } from './variants/use-active-variant';
import { StudioVariantContext } from './variants/variant-context';
import { variantPalette } from './variants/variant-fields';
import { VariantTabs } from './variants/variant-tabs';

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
  const resolvedStore = store ?? browserDocumentStore();
  const studio = useDocumentStudio({ ...props, store: resolvedStore });
  const { draft, setContent } = studio;
  const { selectedId, setSelectedId, pageSelectedId, setPageSelectedId, selectCrumb } =
    useStudioSelection();
  const documentKey = draft?.ref?.documentId ?? (draft === null ? null : NEW);
  // Doc 262: the variant being edited — switching focuses it afresh, with nothing selected (rule 3).
  const { active, tabs } = useActiveVariant({
    content: draft?.content ?? null,
    documentKey,
    isNew: (key) => key === NEW,
    manage: draft?.template === undefined,
    setContent,
    onSwitch: () => {
      setFocus('default');
      setSelectedId(null);
      setPageSelectedId(null);
    },
  });
  const items = useMemo(
    () =>
      draft === null
        ? []
        : variantPalette(
            uniqueItems(
              (palette ?? defaultPalette)({
                type: draft.type,
                kind: draft.kind,
                content: draft.content,
              }),
            ),
            draft.content,
            active,
          ),
    [palette, draft, active],
  );
  const { governance, insert, removeEl, copyEl, editColumns, moveEl, accepts } = useStudioEdits(
    draft,
    items,
    studio.governing?.capabilities,
    setContent,
    active,
  );
  const [dialogOpen, setDialogOpen] = useState(
    props.documentId === undefined && (props.kind === undefined || props.type === undefined),
  );
  const templates = useTemplates(resolvedStore, dialogOpen);
  // Which collapsed panel is open, expanded — one at a time (doc 233 rule 14).
  const [expanded, setExpanded] = useState<'palette' | 'inspector' | null>(null);
  // Doc 234: Inspect bumps this to reveal the inspector. "Don't ask me again" lasts for this mount, remembered per
  // kind (doc 235 rule 13).
  const [inspectorReveal, setInspectorReveal] = useState(0);
  const [deleteChoices, setDeleteChoices] = useState<DeleteChoices>({});
  const variant = draft === null ? null : variantOf(draft.content, active);
  const [focus, setFocus] = useDocumentFocus(documentKey, variant?.['type']);
  const [mode, setMode] = useStudioMode(documentKey);
  const focusedId = variant === null ? null : resolveFocus(variant, focus);
  const { shownSelection, footerPath } = selectionPaths(
    variant,
    draft?.content.schema ?? {},
    focusedId,
    selectedId,
    pageSelectedId,
  );
  // The choice field whose options are being edited, and its dialog (doc 255).
  // The rule dialog, and the problem check the canvas and inspector draw the error state from (doc 256).
  const rules = useRuleEditor({
    content: draft?.content ?? null,
    onContentChange: setContent,
    variant: active,
  });
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
        basedOn={studio.governing?.name}
        // A root Form's page has no flow to go Back to: its trailing + is the way out (doc 233 rule 9).
        onBack={
          focusedId === null || variant?.['type'] === 'Form' ? undefined : () => setFocus(null)
        }
      />
      {/* Preview edits nothing: the tabs still switch the variant previewed, but New / Rename / Delete are hidden (doc 274 rule 41). */}
      {tabs !== null && <VariantTabs {...tabs} manage={tabs.manage && mode !== 'preview'} />}
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
          <DocumentPreview content={draft.content} focusedId={focusedId} variant={active} />
        ) : (
          <StudioVariantContext.Provider
            value={{ name: active, isDefault: active === DEFAULT_VARIANT }}
          >
            <DocumentCanvas
              uischema={variantOf(draft.content, active)}
              schema={draft.content.schema}
              onChange={(uischema) => setContent(withVariant(draft.content, uischema, active))}
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
              onEditColumns={editColumns}
              onMoveElement={moveEl}
              accepts={accepts}
              onEditRule={rules.open}
              ruleProblems={rules.problems}
              canAddRule={rules.canAdd}
              governance={governance}
              onPageSelect={setPageSelectedId}
              pageSelectedId={pageSelectedId}
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
                  const { layoutId, index, cell } = appendTarget(form, pageSelectedId);
                  // Doc 259 rule 10: say why nothing happened, rather than silently ignoring the click.
                  if (governance !== undefined && !governance.canAdd(layoutId)) {
                    toast.info(LOCKED);
                    return;
                  }
                  insert(layoutId, index, itemId, cell);
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
              onEditRule={rules.open}
              templateRules={draft.kind === 'template'}
              governance={governance}
              variant={active}
            />
            {options.dialog}
            {rules.dialog}
          </StudioVariantContext.Provider>
        )}
      </main>
      <StudioFooter
        // Preview selects nothing, so it shows no breadcrumbs (doc 247 rule 12).
        path={mode === 'preview' ? null : footerPath}
        onSelect={selectCrumb}
        saveError={studio.saveError}
      />
      <NewDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kind={props.kind}
        type={props.type}
        templates={templates}
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
