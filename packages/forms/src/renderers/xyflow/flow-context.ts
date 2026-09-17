import type {
  JsonFormsCellRendererRegistryEntry,
  JsonFormsRendererRegistryEntry,
  JsonSchema,
} from '@jsonforms/core';
import { createContext } from 'react';
import type { LayoutDirection } from './flow-elk';

/** What a Flow's Stage nodes dispatch their Stage element with — the Flow's own dispatch props (doc 195 rule 7). */
export interface FlowContextValue {
  readonly schema: JsonSchema;
  readonly path: string;
  readonly enabled: boolean;
  readonly renderers: JsonFormsRendererRegistryEntry[] | undefined;
  readonly cells: JsonFormsCellRendererRegistryEntry[] | undefined;
  /** Doc 198 rule 32: which way the canvas runs, so a node's handles sit on the faces the edges arrive at. */
  readonly direction: LayoutDirection;
}

/**
 * Set by a Flow around its canvas (doc 195 rules 6, 13): a Stage finding it is in a Flow and draws its card, and a Flow
 * finding it is nested. Its own module — a module exporting a context and a component can't be Fast Refreshed.
 */
export const FlowContext = createContext<FlowContextValue | null>(null);
