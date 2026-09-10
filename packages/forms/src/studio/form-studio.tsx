import { JsonForms } from '@jsonforms/react';
import type { FC } from 'react';
import {
  cells,
  controlRenderers,
  displayRenderers,
  layoutRenderers,
} from '../renderers/studio/index';
import type { FormStudioProps } from '../types/index';
import { useDockPanel } from './dock-panels';
import { DockToggles } from './dock-toggles';
import { STUDIO_SAMPLE_DATA, STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from './sample';
import { StudioWorkspace } from './studio-workspace';

// Built once at module load — a new array per render would make JSONForms re-dispatch everything.
const renderers = [...controlRenderers, ...displayRenderers, ...layoutRenderers];

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
 * panels around a centre canvas, opened and closed from toggles in the header. The centre renders a
 * built-in sample form through `@repo/forms/renderers/studio` (doc 180), so every element appears in
 * its studio frame and the Grid is draggable.
 *
 * Typed as `FC<FormStudioProps>` rather than taking a props parameter: the props type is empty
 * for now, and binding it here keeps the public type wired to the component without declaring an
 * unused parameter.
 */
export const FormStudio: FC<FormStudioProps> = () => {
  const panels = {
    left: useDockPanel('left'),
    right: useDockPanel('right'),
    bottom: useDockPanel('bottom'),
  };

  return (
    <div data-slot="form-studio" className="flex h-full flex-col">
      <header
        data-slot="form-studio-header"
        className="flex h-9 shrink-0 grow-0 items-center justify-end border-b px-1"
      >
        <DockToggles panels={panels} />
      </header>
      <div data-slot="form-studio-content" className="min-h-0 flex-1">
        <StudioWorkspace panels={panels}>
          <JsonForms
            schema={STUDIO_SAMPLE_SCHEMA}
            uischema={STUDIO_SAMPLE_UISCHEMA}
            data={STUDIO_SAMPLE_DATA}
            renderers={renderers}
            cells={cells}
          />
        </StudioWorkspace>
      </div>
      <footer data-slot="form-studio-footer" className="h-9 shrink-0 grow-0 border-t" />
    </div>
  );
};
