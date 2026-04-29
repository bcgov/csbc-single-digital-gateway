import type { SchemaDoc, UiSchemaDoc } from "../model/types.js";

export interface Snapshot {
  schema: SchemaDoc;
  uiSchema: UiSchemaDoc;
}

export interface History {
  past: Snapshot[];
  future: Snapshot[];
}

export const HISTORY_LIMIT = 100;

export function emptyHistory(): History {
  return { past: [], future: [] };
}

export function pushHistory(history: History, snapshot: Snapshot): History {
  const past = [...history.past, snapshot];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { past, future: [] };
}

export interface UndoResult {
  history: History;
  snapshot: Snapshot;
}

export function undoHistory(
  history: History,
  current: Snapshot,
): UndoResult | null {
  if (history.past.length === 0) return null;
  const past = [...history.past];
  const snapshot = past.pop() as Snapshot;
  return {
    history: { past, future: [...history.future, current] },
    snapshot,
  };
}

export function redoHistory(
  history: History,
  current: Snapshot,
): UndoResult | null {
  if (history.future.length === 0) return null;
  const future = [...history.future];
  const snapshot = future.pop() as Snapshot;
  return {
    history: { past: [...history.past, current], future },
    snapshot,
  };
}

export function clearHistory(): History {
  return emptyHistory();
}
