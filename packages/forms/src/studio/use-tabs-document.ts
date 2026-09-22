import type { UISchemaElement } from '@jsonforms/core';
import { useCallback, useMemo, useRef } from 'react';
import { TAB_TYPE } from '../renderers/gridstack/grid-layouts';
import type { TabsEditor } from '../renderers/gridstack/tabs-editor';
import { addTab, reorderTabs } from './layout/tabs-edits';
import type { ElementIds } from './layout/element-ids';
import { elementPath } from './layout/element-path';
import type { TreeElement } from './layout/element-tree';
import type { UischemaUpdate } from './use-flow-document';

// The studio's half of the tab strip port (doc 216 rules 14-19), split out of `use-studio-document` and
// `use-studio-selection` — both already over this repo's 300-line gate — exactly as `use-flow-document`
// splits the Flow's. The shape is the Flow's three layers: a DOCUMENT editor that writes edits back, a
// SELECTION wrapper that routes the gestures which are selection changes, and one provider in the canvas.

/**
 * Doc 216 rule 17: the Tab that is open, DERIVED from the selection — never stored.
 *
 * The open tab is whichever Tab lies on the path from the root down to the selection and is a DIRECT
 * child of the Tabs with `tabsId`: the author is looking at the panel their selection is
 * inside. `undefined` when the selection is elsewhere, is the Tabs itself, or there is none — the
 * renderer falls back to the first tab, so guessing here would fight it.
 *
 * This is doc 197's rule applied again ("which thing is drilled into is not state"): no open-tab state, no
 * authored Tab id, and nothing to repair when a tab is deleted.
 */
export function openTabOnPath(
  uischema: UISchemaElement,
  tabsId: string,
  selectedId: string | null,
  ids: ElementIds,
): string | undefined {
  if (selectedId === null) return undefined;
  const path = elementPath(uischema as TreeElement, selectedId, ids);
  const index = path.findIndex((element) => ids.idOf(element) === tabsId);
  if (index < 0) return undefined;
  // `noUncheckedIndexedAccess`: the selection may BE the Tabs, and then there is no next element.
  const next = path[index + 1];
  return next?.type === TAB_TYPE ? ids.idOf(next) : undefined;
}

/** What the selection-side tabs editor needs from the studio selection. */
export interface SelectionTabsActions {
  /** Rule 18: asks to delete the Tab — the same confirmation every other element's Delete goes through. */
  requestDelete(elementId: string): void;
  select(elementId: string): void;
  /** Rule 16: adds a Tab to that Tabs, returning the new element's id. */
  insert(tabsId: string): string | undefined;
  /** Rule 17: the open Tab for the CURRENT selection. */
  openTabId(tabsId: string): string | undefined;
}

/**
 * The studio document's Tabs half (doc 216 rules 16, 18-19): a tabs editor writing reorders back to
 * the uischema, and an add returning the new Tab's id so selection can route it.
 *
 * The editor keeps its identity across edits (doc 189 rule 25), so the document it reads comes through a ref:
 * a strip that rebuilt its port on every edit would be a re-render of every tab for every keystroke.
 */
export function useTabsDocument(
  ids: ElementIds,
  updateUischema: UischemaUpdate,
  uischema: UISchemaElement,
) {
  // Assigned during render, not in an effect: `openTabFor` is called while the renderers render, so an
  // effect-assigned ref would answer from the PREVIOUS document and no re-render would correct it.
  const latest = useRef(uischema);
  latest.current = uischema;

  const tabsEditor = useMemo<TabsEditor>(
    () => ({
      idOf: (element) => ids.idOf(element),
      // Rule 19: order only — `reorderTabs` writes `elements` order and never a coordinate. `open-tab`
      // and `add-tab` are selection's (rules 15-16), and a refused reorder returns the same uischema, which
      // `updateUischema` drops without a state change.
      onGesture: (gesture) => {
        if (gesture.type !== 'reorder-tabs') return;
        updateUischema((current) =>
          reorderTabs(current, gesture.tabsId, gesture.from, gesture.to, ids),
        );
      },
      // The document knows no selection; the selection wrapper below answers this one (rule 17).
      openTabId: () => undefined,
    }),
    [ids, updateUischema],
  );

  /**
   * Rule 16: ONE edit, one undo — the Tab and its empty panel arrive together — applied to the document
   * the author is looking at, so the new element's id can be returned and selected at once (doc 198 rule 16,
   * the same routing as the Flow's `append` / `add-form`).
   */
  const insertTab = useCallback(
    (tabsId: string): string | undefined => {
      const result = addTab(latest.current, tabsId, ids);
      if (!result.inserted) return undefined;
      updateUischema(() => result.uischema);
      return ids.idOf(result.inserted);
    },
    [ids, updateUischema],
  );

  /** Rule 17: the derivation, bound to the current document; the selection supplies `selectedId`. */
  const openTabFor = useCallback(
    (tabsId: string, selectedId: string | null): string | undefined =>
      openTabOnPath(latest.current, tabsId, selectedId, ids),
    [ids],
  );

  return { tabsEditor, insertTab, openTabFor };
}

/**
 * The tabs editor the canvas receives (doc 216 rules 15-17): `open-tab` selects the Tab, `add-tab` makes
 * one and selects it, and the open tab is answered from the selection. Everything else is the document's.
 *
 * The actions are read through a ref so the editor keeps its identity across renders — but the ref is assigned
 * DURING render (unlike `useSelectionFlowEditor`'s, whose actions are only ever called from event handlers),
 * because `openTabId` is a render-time question about the CURRENT selection.
 */
export function useSelectionTabsEditor(
  documentEditor: TabsEditor,
  actions: SelectionTabsActions,
  selectedId: string | null,
): TabsEditor {
  const latest = useRef(actions);
  latest.current = actions;
  return useMemo<TabsEditor>(
    () => ({
      idOf: (element) => documentEditor.idOf(element),
      onGesture: (gesture) => {
        // Rule 15: opening a tab is a SELECTION change, not a document edit — there is nothing to undo.
        if (gesture.type === 'open-tab') latest.current.select(gesture.tabId);
        // Rule 18: ASKS rather than removing — deleting a Tab takes its TabContent and every field in it, so it
        // gets the same confirmation as any other element. The Tab is not a grid item, so the strip's own
        // control is the only route to it.
        else if (gesture.type === 'remove-tab') latest.current.requestDelete(gesture.tabId);
        else if (gesture.type === 'add-tab') {
          // Rule 16: an inserting gesture becomes the selection, so the author is looking at the panel they
          // just made. Doc 216 rule 18: deletion is NOT a gesture — the element delete confirmation owns it.
          const insertedId = latest.current.insert(gesture.tabsId);
          if (insertedId !== undefined) latest.current.select(insertedId);
        } else documentEditor.onGesture(gesture);
      },
      openTabId: (tabsId) => latest.current.openTabId(tabsId),
    }),
    // `selectedId` IS a dependency, deliberately, even though it is read through the ref above.
    //
    // Doc 216 rule 17 derives the open tab from the selection, and a ref gives no subscription: JSONForms
    // memoises a dispatched renderer on its uischema, so a selection-only change re-rendered the studio shell
    // and never re-rendered the strip — the breadcrumb moved to the clicked Tab while the strip kept the old
    // one open, which meant tabs could not be switched on the canvas at all. Rebuilding the editor makes the
    // CONTEXT VALUE change, and a context change re-renders consumers regardless of memoisation.
    //
    // This is safe here in a way it would NOT be for the Grid editor, whose identity must be stable or every
    // grid reloads (doc 189 rule 25): the only consumer of this context is the Tabs renderer, and re-rendering
    // it is exactly the point. FOUND BY HAND and independently by the test suite.
    [documentEditor, selectedId],
  );
}
