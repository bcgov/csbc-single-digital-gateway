import type { FC } from 'react';
import type { FormStudioProps } from '../types/index';

/**
 * The Form Studio shell: a fixed 36px header, a content area that flexes to fill whatever is
 * left, and a fixed 36px footer, stacked top-down over the full height of its container.
 *
 * `h-9` is 36px on the default Tailwind scale. Header and footer carry `shrink-0 grow-0` so they
 * hold that height exactly once the content area overflows; the content area carries `min-h-0`
 * so it may shrink below its intrinsic size instead of pushing the footer out of view — a flex
 * child's default `min-height: auto` would otherwise break the layout the moment real content
 * lands in it.
 *
 * Typed as `FC<FormStudioProps>` rather than taking a props parameter: the props type is empty
 * for now, and binding it here keeps the public type wired to the component without declaring an
 * unused parameter.
 */
export const FormStudio: FC<FormStudioProps> = () => (
  <div data-slot="form-studio" className="flex h-full flex-col">
    <header data-slot="form-studio-header" className="h-9 shrink-0 grow-0" />
    <div
      data-slot="form-studio-content"
      className="flex min-h-0 flex-1 items-center justify-center"
    >
      Hello, FormStudio!
    </div>
    <footer data-slot="form-studio-footer" className="h-9 shrink-0 grow-0" />
  </div>
);
