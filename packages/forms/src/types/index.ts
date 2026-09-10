/**
 * Public types for `@repo/forms` (docs 178, 180).
 *
 * This module is the package root entry (`@repo/forms`) and is deliberately types-only —
 * components are reached through their own submodule subpath (`@repo/forms/studio`,
 * `@repo/forms/renderers/ui`, …).
 */

export type { RendererSet } from './renderer-set';
export type {
  GridElement,
  GridElementOptions,
  GridItemPlacement,
  GridRenderersOptions,
  GridStackLayoutOptions,
  HeadingElement,
} from './elements';

/**
 * Props accepted by `FormStudio`.
 *
 * The studio takes no configuration yet; this is a real, exported marker type whose shape grows
 * as the studio gains capability. `Record<string, never>` rather than `{}` — the latter means
 * "any non-nullish value" to TypeScript and trips oxlint's empty-object-type rule, whereas this
 * genuinely admits only the empty object.
 */
export type FormStudioProps = Record<string, never>;
