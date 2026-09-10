import type { BaseUISchemaElement, ControlElement, Layout } from '@jsonforms/core';
import type { HeadingLevel } from '@repo/ui/heading';
import type { ComponentMap, GridStackOptions, GridStackWidget } from 'gridstack/dist/react';

/** `{ type: 'Heading' }` — a display element rendered by `@repo/ui`'s `Heading` (doc 180). */
export interface HeadingElement extends BaseUISchemaElement {
  type: 'Heading';
  text: string;
  options?: {
    /** Semantic element, `1` → `<h1>`. Anything but an integer 1-6 falls back to `<h1>`. */
    level?: HeadingLevel;
    /** Visual scale, independent of `level`. Anything but an integer 1-6 emits no size class. */
    size?: HeadingLevel;
    [key: string]: unknown;
  };
}

/** Options every `renderers/ui` control reads. Values of the wrong type are ignored (doc 182). */
interface ControlOptions {
  /** Placeholder text; ignored unless a non-empty string. */
  placeholder?: string;
  [key: string]: unknown;
}

/** A `type: 'string'` control rendered by `@repo/ui`'s `Input` — the default for strings (doc 182). */
export interface InputControlElement extends ControlElement {
  options?: ControlOptions & { component?: 'input' };
}

/** A `type: 'string'` control rendered by `@repo/ui`'s `Textarea` (doc 182). */
export interface TextareaControlElement extends ControlElement {
  options: ControlOptions & { component: 'textarea' };
}

/**
 * A `type: 'number'` control rendered by `@repo/ui`'s `NumberInput` (doc 182). `min`/`max` come from
 * the schema's `minimum`/`maximum`; `step` falls back to the schema's `multipleOf`.
 */
export interface NumberInputControlElement extends ControlElement {
  options?: ControlOptions & {
    component?: 'number';
    step?: number;
    smallStep?: number;
    largeStep?: number;
    /** Ignored when `Intl.NumberFormat` rejects it (with `locale`). */
    format?: Intl.NumberFormatOptions;
    /** Ignored when `Intl.NumberFormat` rejects it. Defaults to the runtime locale. */
    locale?: string;
    allowWheelScrub?: boolean;
    snapOnStep?: boolean;
  };
}

/** The GridStack options an authored `Grid` element may set — everything else is ignored. */
export type GridElementOptions = Pick<
  GridStackOptions,
  'column' | 'cellHeight' | 'margin' | 'float' | 'minRow' | 'maxRow'
>;

/** Placement of one child inside its `Grid`, read from `child.options.gridItem`. */
export type GridItemPlacement = Pick<
  GridStackWidget,
  'x' | 'y' | 'w' | 'h' | 'minW' | 'maxW' | 'minH' | 'maxH' | 'noMove' | 'noResize' | 'locked'
>;

/** `{ type: 'Grid' }` — a layout whose children are laid out by gridstack.js (doc 180). */
export interface GridElement extends Layout {
  type: 'Grid';
  options?: GridElementOptions & { [key: string]: unknown };
}

/** GridStack options a consumer may pass to the factory — the widgets always come from `elements`. */
export type GridStackLayoutOptions = Omit<GridStackOptions, 'children' | 'subGridOpts'>;

/** Options for `createGridRenderers` (`@repo/forms/renderers/gridstack`). */
export interface GridRenderersOptions {
  /**
   * Merged over the built-in components map. An entry under `GRID_ELEMENT_COMPONENT` replaces the
   * built-in grid item renderer (e.g. to add a drag handle around `GridElementDispatch`).
   */
  components?: ComponentMap;
  /**
   * Overrides the built-in defaults
   * `{ column: 12, cellHeight: '1rem', margin: '0.5rem', staticGrid: true, sizeToContent: true }`.
   */
  gridOptions?: GridStackLayoutOptions;
  /** Extra classes on the `.grid-stack` root — how a consumer styles its items (doc 180 rule 7). */
  className?: string;
}
