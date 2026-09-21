import type {
  JsonFormsCellRendererRegistryEntry,
  JsonFormsRendererRegistryEntry,
  JsonSchema,
  UISchemaElement,
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
  /**
   * Doc 210 rule 23: the Flow ELEMENT itself, and its studio element id under an editor. A dispatched Condition
   * card can reach neither on its own, and the `+` on one of its outputs needs both — the element to ask which
   * existing nodes may be connected to, the id to name the Flow in a `connect` gesture. The id is absent on a
   * view-only Flow, exactly as `ActionEdgeData.flowId` is (doc 198 rule 9).
   */
  readonly element: UISchemaElement;
  readonly id: string | undefined;
}

/**
 * Set by a Flow around its canvas (doc 195 rules 6, 13): a Stage finding it is in a Flow and draws its card, and a Flow
 * finding it is nested. Its own module — a module exporting a context and a component can't be Fast Refreshed.
 */
export const FlowContext = createContext<FlowContextValue | null>(null);
