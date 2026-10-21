import type { UISchemaElement } from '@jsonforms/core';
import { createContext, useContext } from 'react';

/**
 * A finished user gesture on an editable tab strip (doc 216 rules 14-19).
 *
 * `remove-tab` is neither an edit nor a selection change: it ASKS, routing to the element delete confirmation
 * every other element already uses (rule 18). A Tab is not a grid item, so it never gets the actions popover
 * that would otherwise offer Delete — without this gesture there is no way to remove a tab at all.
 *
 * `open-tab` is a SELECTION change, not a document edit — the studio derives which tab is open from the
 * selection (rule 17), so opening a tab means selecting its Tab. The Flow's `open` gesture is the same
 * idea (doc 196), and the inserting gesture routes through selection for the same reason.
 */
export type TabsGesture =
  | { type: 'open-tab'; tabId: string }
  | { type: 'add-tab'; tabsId: string }
  | { type: 'remove-tab'; tabId: string }
  | { type: 'reorder-tabs'; tabsId: string; from: number; to: number };

/**
 * The port that turns a tab strip into an editable one (doc 216 rule 14), shaped like `GridEditor` (doc 183)
 * and `FlowEditor` (doc 196).
 *
 * WITHOUT A PROVIDER the strip is static: no `+`, no drag to reorder, and the open tab is the renderer's own
 * state. That is the whole of "the tab list is static in a fillable form" — the absence of a provider, never a
 * mode flag, which is the house rule a mode prop would break in every branch of the renderer.
 */
export interface TabsEditor {
  /** A stable id for `element` — the same ids the rest of the studio keys elements by. */
  idOf(element: UISchemaElement): string;
  onGesture(gesture: TabsGesture): void;
  /**
   * Rule 17: the Tab the studio wants open, derived from its selection. `undefined` leaves the choice to
   * the renderer, which falls back to the first Tab.
   *
   * The studio owns the selection, so it answers this — the renderer must not reach into `renderers/studio`
   * for it, exactly as `renderers/xyflow` never does.
   */
  openTabId(tabsId: string): string | undefined;
}

// Kept in a module with no components, like `grid-editor.ts`, so components using it stay Fast Refresh-able.
const TabsEditorContext = createContext<TabsEditor | null>(null);

export const TabsEditorProvider = TabsEditorContext.Provider;

/** The editor for the tab strips below, or `null` for a fillable form, a preview or a review page. */
export function useTabsEditor(): TabsEditor | null {
  return useContext(TabsEditorContext);
}
