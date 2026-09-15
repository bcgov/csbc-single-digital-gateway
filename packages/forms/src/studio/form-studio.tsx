import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { useMemo, useRef, useState, type FC } from 'react';
import * as defaultSet from '../renderers/default/index';
import { GridEditorProvider, type GridEditor } from '../renderers/gridstack/grid-editor';
import { FORM_TYPE } from '../renderers/gridstack/grid-layouts';
import * as studioSet from '../renderers/studio/index';
import {
  StudioSelectionProvider,
  type StudioSelection,
} from '../renderers/studio/studio-selection';
import type { FormStudioProps } from '../types/index';
import { StudioCodePanel } from './code/studio-code-panel';
import { DeleteConfirmation } from './delete-confirmation';
import { useDockPanel } from './dock-panels';
import { DockToggles } from './dock-toggles';
import { PreviewToggle } from './preview-toggle';
import { STUDIO_SAMPLE_DATA } from './sample';
import { StudioBreadcrumbs } from './studio-breadcrumbs';
import { StudioInspector } from './studio-inspector';
import { StudioPalette } from './studio-palette';
import { StudioWorkspace } from './studio-workspace';
import { useInspectorPanel } from './use-inspector-panel';
import { usePreviewMode } from './use-preview-mode';
import { useStudioDocument } from './use-studio-document';
import { useStudioSelection } from './use-studio-selection';

// Built once at module load — a new array per render would make JSONForms re-dispatch everything.
const STUDIO_RENDERERS = [
  ...studioSet.controlRenderers,
  ...studioSet.displayRenderers,
  ...studioSet.layoutRenderers,
];
const PREVIEW_RENDERERS = [
  ...defaultSet.controlRenderers,
  ...defaultSet.displayRenderers,
  ...defaultSet.layoutRenderers,
];

const ROOT_FORM_MESSAGE = 'The root element must be a Form.';

interface StudioCanvasProps {
  readonly schema: JsonSchema;
  readonly uischema: UISchemaElement;
  readonly previewing: boolean;
  readonly selection: StudioSelection;
  readonly editor: GridEditor;
}

/**
 * The centre panel's content: the document through the studio renderers, or through the fillable default renderers
 * in preview (doc 184) — or, when the root is not a Form, the root error in its place in both (doc 192 rule 7).
 */
function StudioCanvas({ schema, uischema, previewing, selection, editor }: StudioCanvasProps) {
  if (uischema.type !== FORM_TYPE) {
    return (
      <p role="alert" data-slot="form-studio-root-error" className="text-sm text-destructive">
        {ROOT_FORM_MESSAGE}
      </p>
    );
  }
  if (previewing) {
    return (
      <JsonForms
        key="preview"
        schema={schema}
        uischema={uischema}
        data={STUDIO_SAMPLE_DATA}
        renderers={PREVIEW_RENDERERS}
        cells={defaultSet.cells}
      />
    );
  }
  return (
    <StudioSelectionProvider value={selection}>
      <GridEditorProvider value={editor}>
        <JsonForms
          key="studio"
          schema={schema}
          uischema={uischema}
          data={STUDIO_SAMPLE_DATA}
          renderers={STUDIO_RENDERERS}
          cells={studioSet.cells}
          validationMode="NoValidation"
        />
      </GridEditorProvider>
    </StudioSelectionProvider>
  );
}

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
 * back to the uischema through the Grid editor port. Its root must be a Form (doc 192): any other root
 * shows an error in the canvas and preview instead, and the code editor only applies Form roots.
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
 * dragged onto a grid lands where it is dropped; one clicked or activated with the keyboard lands next to the
 * selection. Either way it arrives with a default configuration and is selected.
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
export const FormStudio: FC<FormStudioProps> = ({ schema, uischema }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const studio = useStudioDocument({ schema, uischema });
  const panels = {
    left: useDockPanel('left'),
    right: useDockPanel('right'),
    bottom: useDockPanel('bottom'),
  };
  const { previewing, setPreviewing } = usePreviewMode(panels);
  const { port, editor, confirmation, hover, select, pressing, add } = useStudioSelection(
    rootRef,
    !previewing,
    studio,
  );
  const paletteActions = useMemo(() => ({ add }), [add]);
  const { selectedId } = port;
  const inspector = useInspectorPanel(studio, selectedId, pressing, panels.right);
  const segments = studio.pathOf(selectedId);
  // Doc 191 rule 3: nothing of Monaco loads until the bottom panel first opens.
  const [codeOpened, setCodeOpened] = useState(false);
  if (panels.bottom.open && !codeOpened) setCodeOpened(true);

  return (
    <div ref={rootRef} data-slot="form-studio" className="flex h-full flex-col">
      <header
        data-slot="form-studio-header"
        className="flex h-9 shrink-0 grow-0 items-center justify-end gap-1 border-b px-1"
      >
        {previewing ? null : <DockToggles panels={panels} />}
        <PreviewToggle pressed={previewing} onPressedChange={setPreviewing} />
      </header>
      <div data-slot="form-studio-content" className="min-h-0 flex-1">
        <StudioWorkspace
          panels={panels}
          left={previewing ? null : <StudioPalette actions={paletteActions} />}
          right={
            previewing ? null : (
              <StudioInspector
                elementId={selectedId}
                label={segments.at(-1)?.label ?? ''}
                form={inspector}
                onChange={studio.updateElement}
              />
            )
          }
          bottom={
            previewing || !codeOpened ? null : (
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
            previewing={previewing}
            selection={port}
            editor={editor}
          />
        </StudioWorkspace>
      </div>
      <footer
        data-slot="form-studio-footer"
        className="flex h-9 shrink-0 grow-0 items-center border-t px-2"
      >
        {previewing ? null : (
          <StudioBreadcrumbs
            segments={segments}
            currentId={selectedId}
            onHover={hover}
            onSelect={select}
          />
        )}
      </footer>
      <DeleteConfirmation
        pending={confirmation.pending}
        onConfirm={confirmation.confirm}
        onCancel={confirmation.cancel}
      />
    </div>
  );
};
