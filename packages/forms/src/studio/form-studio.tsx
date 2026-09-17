import { Button } from '@repo/ui/button';
import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { FLOW_TYPE } from '../renderers/xyflow/flow-elements';
import type { FormStudioProps } from '../types/index';
import { StudioCodePanel } from './code/studio-code-panel';
import { DeleteConfirmation } from './delete-confirmation';
import { NewFormDialog } from './document/new-form-dialog';
import { useDocumentSession } from './document/use-document-session';
import { useEmptyPanels } from './document/use-empty-panels';
import { useDockPanel, type DockPanelId } from './dock-panels';
import { DockToggles } from './dock-toggles';
import { useFocusAddress } from './use-focus-address';
import { PreviewToggle } from './preview-toggle';
import { ViewportToggles, type PreviewViewport } from './viewport-toggles';
import { StudioBackButton } from './studio-back-button';
import { StudioBreadcrumbs } from './studio-breadcrumbs';
import { StudioCanvas } from './studio-canvas';
import { StudioInspector } from './studio-inspector';
import { StudioPalette } from './studio-palette';
import { StudioWorkspace } from './studio-workspace';
import { useInspectorPanel } from './use-inspector-panel';
import { usePreviewFocus } from './use-preview-focus';
import { usePreviewMode } from './use-preview-mode';
import { useStudioDocument } from './use-studio-document';
import { useStudioSelection } from './use-studio-selection';

/**
 * The Form Studio shell: a fixed 36px header, a content area that flexes to fill whatever is
 * left, and a fixed 36px footer, stacked top-down over the full height of its container.
 *
 * `h-9` is 36px on the default Tailwind scale. Header and footer carry `shrink-0 grow-0` so they
 * hold that height exactly once the content area overflows; the content area carries `min-h-0`
 * so it may shrink below its intrinsic size instead of pushing the footer out of view — a flex
 * child's default `min-height: auto` would otherwise break the layout.
 *
 * The content area is a resizable workspace (doc 181): collapsible left, right and bottom dock
 * panels around a centre canvas, opened and closed from toggles in the header. The centre renders the
 * studio's document through `@repo/forms/renderers/studio` (doc 180), so every element appears in its
 * studio frame and the Grids are draggable.
 *
 * The studio owns that document (doc 183): `schema`/`uischema` props seed it (else the built-in
 * sample), a different object resets it, and every finished drag, resize or cross-grid move is written
 * back to the uischema through the Grid editor port. Its root must be a Form (doc 192) or a Flow (doc 195): any other
 * root shows an error in the canvas and preview instead, and the code editor only applies Form or Flow roots.
 *
 * A Flow is edited on its canvas through the Flow editor port (doc 196): Stages drag, handles connect, selected edges
 * delete, and a Stage's popover or a Form row deletes. Selecting a Form in a Stage drills in — the canvas shows that
 * Form — and selecting its Stage or Flow, or Escape, backs out. Preview of a drilled-in Form previews that Form alone.
 *
 * Grid items can be hovered and selected, and copied or deleted from their actions popover (doc 185)
 * through the studio selection port; deletes are confirmed unless the author opted out. The root element
 * can be hovered and selected too, without actions, and Escape walks the selection up to the parent. The
 * footer's breadcrumbs name the path to the selection — the root alone when nothing is selected — and
 * hover or select any element on it (doc 186).
 *
 * The right dock panel holds the inspector (doc 187): the selected element's settings as a form that writes
 * every valid change straight back to the document. The panel opens whenever the selection changes to an
 * element — once any press is released — and never closes on its own. The canvas renders without
 * validation, so authoring a constraint such as Required never paints data errors on the inert design
 * surface; preview still validates (doc 187 rule 25b).
 *
 * The left dock panel holds the palette (doc 189): every element the studio renders, searchable and grouped. An item
 * dragged onto a grid lands where it is dropped; one clicked or activated with the keyboard lands next to the selection.
 * Either way it arrives with a default configuration and is selected. Doc 198 rules 17-19: a Flow is authored entirely
 * on its canvas, so while the canvas shows one the palette is closed and its toggle is gone, returning when the author
 * drills into a Form.
 *
 * The bottom dock panel holds the code editors (doc 191): the schema and uischema as JSON, side by side, with
 * completion from the studio's metaschemas. Monaco loads the first time the panel opens and the editors stay mounted
 * after that; valid edits write their half of the document back, keeping element ids — and so the selection — by
 * tree path.
 *
 * The play toggle switches to preview (doc 184): the panel toggles go, open panels close, and the same
 * document renders through the fillable `renderers/default` without the Grid editor or selection — in
 * its own `JsonForms`, so anything typed is discarded when preview ends.
 */
/** Doc 198 rule 17: the toggles shown while the Flow canvas is up — the left panel is unreachable there. */
const FLOW_PANEL_IDS: readonly DockPanelId[] = Object.freeze(['bottom', 'right']);

export const FormStudio: FC<FormStudioProps> = ({
  schema,
  uischema,
  loadDocument,
  onSaveDocument,
  focusedForm,
  onFocusedFormChange,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  // Doc 200 rules 1-2: which document to open, and what to show while getting there. A seeded document is `ready` at
  // once, so a host passing `schema`/`uischema` behaves exactly as it did before this feature.
  const session = useDocumentSession({ schema, uischema, loadDocument });
  const ready = session.status === 'ready';
  // Doc 200 rule 7: open while choosing, and reopened by the empty state's call to action.
  const [dialogOpen, setDialogOpen] = useState(true);
  // Until there is a document the studio still holds one (the sample) so the hooks below stay unconditional — the
  // canvas never draws it, because rule 15 returns the empty state before the document is rendered.
  const studio = useStudioDocument(session.document ?? {});
  const panels = {
    left: useDockPanel('left'),
    right: useDockPanel('right'),
    bottom: useDockPanel('bottom'),
  };
  // Doc 200 rules 18-20. Declared AFTER `ready`, which it reads — see the TDZ trap in the hook's own comment.
  useEmptyPanels(panels, ready);
  const mode = usePreviewMode(panels);
  const { port, editor, flowEditor, confirmation, hover, select, pressing, add } =
    useStudioSelection(rootRef, !mode.previewing, studio);
  const { selectedId } = port;
  const focusId = studio.canvasRootOf(selectedId);
  // Doc 197 rules 8-13: optional, two-way URL wiring for the drilled-in Form. No props, no effect.
  useFocusAddress({
    uischema: studio.uischema,
    ids: studio.ids,
    focusId,
    focusedForm,
    onFocusedFormChange,
    select,
    seed: studio.seed,
  });
  const { previewing, previewFocusId, setPreviewing } = usePreviewFocus({
    ...mode,
    focusId,
    select,
    contains: (elementId) => studio.elementOf(elementId) !== undefined,
  });
  // Doc 184 rule 16: Desktop by default, and KEPT across preview sessions for this mount — unlike preview answers
  // (rule 11), a chosen size is the author's working setup, not data to discard.
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const paletteActions = useMemo(() => ({ add }), [add]);
  const inspector = useInspectorPanel(studio, selectedId, pressing, panels.right);
  const segments = studio.pathOf(selectedId);
  // Doc 191 rule 3: nothing of Monaco loads until the bottom panel first opens.
  const [codeOpened, setCodeOpened] = useState(false);
  if (panels.bottom.open && !codeOpened) setCodeOpened(true);

  // Doc 196 rule 12: what the canvas and preview render.
  const rootOf = (elementId: string | null) =>
    (elementId === null ? undefined : studio.elementOf(elementId)) ?? studio.uischema;
  // Doc 198 rule 17: the Flow canvas is showing when the root is a Flow and nothing is drilled into.
  const onFlowCanvas = studio.uischema.type === FLOW_TYPE && focusId === null;

  /**
   * Doc 198 rule 18: hiding only the toggle would strand an open panel with no way to shut it, so the panel closes with
   * it — and reopens, at its remembered size, when the author drills into a Form. `hide`/`show` are both idempotent
   * (doc 184 rule 13), and the restore flag means a panel the author had already closed stays closed.
   *
   * Declared AFTER `onFlowCanvas`: a hook reading it any earlier is a temporal dead zone, and the whole shell throws.
   */
  const restoreLeft = useRef(false);
  const { open: leftOpen, show: showLeft, hide: hideLeft } = panels.left;
  useEffect(() => {
    if (onFlowCanvas) {
      if (!leftOpen) return;
      restoreLeft.current = true;
      hideLeft();
    } else if (restoreLeft.current) {
      restoreLeft.current = false;
      showLeft();
    }
  }, [onFlowCanvas, leftOpen, hideLeft, showLeft]);

  return (
    <div ref={rootRef} data-slot="form-studio" className="flex h-full flex-col">
      <header
        data-slot="form-studio-header"
        className="flex h-9 shrink-0 grow-0 items-center justify-end gap-1 border-b px-1"
      >
        {/* Doc 197 rules 14-15, 17: only while drilled in, and never over the preview's chrome-free header. */}
        {previewing || !ready || focusId === null ? null : (
          <StudioBackButton onClick={() => select(null)} />
        )}
        {/* Doc 200 rule 22: the save channel exists and is called; nothing is wired to an API yet. */}
        {ready && !previewing && onSaveDocument !== undefined ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void onSaveDocument({ schema: studio.schema, uischema: studio.uischema })
            }
          >
            Save
          </Button>
        ) : null}
        {/* `exactOptionalPropertyTypes`: an absent `ids` must be an ABSENT KEY, never an explicit `undefined`. */}
        {/* Doc 200 rule 18: no document means no panels at all — the toggles go with them. */}
        {previewing || !ready ? null : (
          <DockToggles panels={panels} {...(onFlowCanvas ? { ids: FLOW_PANEL_IDS } : {})} />
        )}
        {/* Doc 184 rule 15: only while previewing, immediately left of the Preview toggle. */}
        {ready && previewing ? (
          <ViewportToggles value={viewport} onValueChange={setViewport} />
        ) : null}
        {ready ? <PreviewToggle pressed={previewing} onPressedChange={setPreviewing} /> : null}
      </header>
      <div data-slot="form-studio-content" className="min-h-0 flex-1">
        <StudioWorkspace
          panels={panels}
          left={
            // Doc 200 rule 18: with no document there are no panels, so their content is not mounted
            // either — the same treatment preview already gives them, rather than leaving an inert
            // palette mounted behind the dialog.
            previewing || !ready || onFlowCanvas ? null : <StudioPalette actions={paletteActions} />
          }
          right={
            previewing || !ready ? null : (
              <StudioInspector
                elementId={selectedId}
                label={segments.at(-1)?.label ?? ''}
                form={inspector}
                onChange={studio.updateElement}
              />
            )
          }
          bottom={
            previewing || !ready || !codeOpened ? null : (
              <StudioCodePanel
                schema={studio.schema}
                uischema={studio.uischema}
                onReplace={studio.replaceDocument}
              />
            )
          }
        >
          <StudioCanvas
            schema={studio.schema}
            uischema={studio.uischema}
            canvasRoot={rootOf(focusId)}
            previewRoot={rootOf(previewFocusId)}
            rootKey={(previewing ? previewFocusId : focusId) ?? 'document'}
            previewing={previewing}
            viewport={viewport}
            selection={port}
            editor={editor}
            flowEditor={flowEditor}
            status={session.status}
            reason={session.reason}
            onNewForm={() => setDialogOpen(true)}
            onRetry={session.retry}
          />
        </StudioWorkspace>
      </div>
      <footer
        data-slot="form-studio-footer"
        className="flex h-9 shrink-0 grow-0 items-center border-t px-2"
      >
        {previewing || !ready ? null : (
          <StudioBreadcrumbs
            segments={segments}
            currentId={selectedId}
            onHover={hover}
            onSelect={select}
          />
        )}
      </footer>
      {/* Doc 200 rules 7, 11: only while choosing. Dismissing reports nothing, so the session stays `choosing`. */}
      {session.status === 'choosing' ? (
        <NewFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onChoose={session.choose} />
      ) : null}
      <DeleteConfirmation
        pending={confirmation.pending}
        onConfirm={confirmation.confirm}
        onCancel={confirmation.cancel}
      />
    </div>
  );
};
