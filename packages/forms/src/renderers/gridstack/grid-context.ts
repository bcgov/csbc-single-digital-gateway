import type {
  JsonFormsCellRendererRegistryEntry,
  JsonFormsRendererRegistryEntry,
  JsonSchema,
  UISchemaElement,
} from '@jsonforms/core';
import { createContext } from 'react';
import type { GridLayoutKind } from './grid-layouts';

/** What a Grid hands its child widgets — everything `JsonFormsDispatch` needs except the element id. */
export interface GridContextValue {
  /** Which layout renders the items (doc 180 rule 24) — items in a vertical or horizontal one always fit. */
  layout: GridLayoutKind;
  /** The Grid's elements by widget/element id (doc 183 rule 7). */
  elementsById: ReadonlyMap<string, UISchemaElement>;
  schema: JsonSchema;
  path: string;
  enabled: boolean;
  renderers: JsonFormsRendererRegistryEntry[] | undefined;
  cells: JsonFormsCellRendererRegistryEntry[] | undefined;
  /** The factory's resolved `sizeToContent` — whether items are re-measured to fit their content. */
  sizeToContent: boolean;
}

/**
 * Scoped to one Grid. GridStack renders items through portals, and React context crosses portals,
 * so each item reads its own (nearest) Grid — nested Grids resolve correctly.
 *
 * Kept in its own module: a file exporting both a context and a component cannot be Fast Refreshed,
 * so Vite would fully invalidate grid-element.tsx on every edit.
 */
export const GridContext = createContext<GridContextValue | null>(null);
