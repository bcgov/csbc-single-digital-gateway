import { JsonForms } from '@jsonforms/react';
import type { FC } from 'react';
import {
  cells,
  controlRenderers,
  displayRenderers,
  layoutRenderers,
} from '../renderers/studio/index';
import type { FormStudioProps } from '../types/index';
import { STUDIO_SAMPLE_DATA, STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from './sample';

// Built once at module load — a new array per render would make JSONForms re-dispatch everything.
const renderers = [...controlRenderers, ...displayRenderers, ...layoutRenderers];

/**
 * The Form Studio shell: a fixed 36px header, a content area that flexes to fill whatever is
 * left, and a fixed 36px footer, stacked top-down over the full height of its container.
 *
 * `h-9` is 36px on the default Tailwind scale. Header and footer carry `shrink-0 grow-0` so they
 * hold that height exactly once the content area overflows; the content area carries `min-h-0`
 * so it may shrink below its intrinsic size instead of pushing the footer out of view — a flex
 * child's default `min-height: auto` would otherwise break the layout — and `overflow-auto` so a
 * tall form scrolls inside it.
 *
 * The content area renders a built-in sample form through `@repo/forms/renderers/studio` (doc 180),
 * so every element appears in its studio frame and the Grid is draggable.
 *
 * Typed as `FC<FormStudioProps>` rather than taking a props parameter: the props type is empty
 * for now, and binding it here keeps the public type wired to the component without declaring an
 * unused parameter.
 */
export const FormStudio: FC<FormStudioProps> = () => (
  <div data-slot="form-studio" className="flex h-full flex-col">
    <header data-slot="form-studio-header" className="h-9 shrink-0 grow-0" />
    <div data-slot="form-studio-content" className="min-h-0 flex-1 overflow-auto p-4">
      <JsonForms
        schema={STUDIO_SAMPLE_SCHEMA}
        uischema={STUDIO_SAMPLE_UISCHEMA}
        data={STUDIO_SAMPLE_DATA}
        renderers={renderers}
        cells={cells}
      />
    </div>
    <footer data-slot="form-studio-footer" className="h-9 shrink-0 grow-0" />
  </div>
);
