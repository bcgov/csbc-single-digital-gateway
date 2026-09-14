import { JsonForms } from '@jsonforms/react';
import { useRef, type FC } from 'react';
import * as defaultSet from '../renderers/default/index';
import { GridEditorProvider } from '../renderers/gridstack/grid-editor';
import * as studioSet from '../renderers/studio/index';
import { StudioSelectionProvider } from '../renderers/studio/studio-selection';
import type { FormStudioProps } from '../types/index';
import { DeleteConfirmation } from './delete-confirmation';
import { useDockPanel } from './dock-panels';
import { DockToggles } from './dock-toggles';
import { PreviewToggle } from './preview-toggle';
import { STUDIO_SAMPLE_DATA } from './sample';
import { StudioWorkspace } from './studio-workspace';
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
 * back to the uischema through the Grid editor port.
 *
 * Grid items can be hovered and selected, and copied or deleted from their actions popover (doc 185)
 * through the studio selection port; deletes are confirmed unless the author opted out.
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
  const { port, editor, confirmation } = useStudioSelection(rootRef, !previewing, studio);

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
        <StudioWorkspace panels={panels}>
          {previewing ? (
            <JsonForms
              key="preview"
              schema={studio.schema}
              uischema={studio.uischema}
              data={STUDIO_SAMPLE_DATA}
              renderers={PREVIEW_RENDERERS}
              cells={defaultSet.cells}
            />
          ) : (
            <StudioSelectionProvider value={port}>
              <GridEditorProvider value={editor}>
                <JsonForms
                  key="studio"
                  schema={studio.schema}
                  uischema={studio.uischema}
                  data={STUDIO_SAMPLE_DATA}
                  renderers={STUDIO_RENDERERS}
                  cells={studioSet.cells}
                />
              </GridEditorProvider>
            </StudioSelectionProvider>
          )}
        </StudioWorkspace>
      </div>
      <footer data-slot="form-studio-footer" className="h-9 shrink-0 grow-0 border-t" />
      <DeleteConfirmation
        pending={confirmation.pending}
        onConfirm={confirmation.confirm}
        onCancel={confirmation.cancel}
      />
    </div>
  );
};
