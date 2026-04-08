import type { HandoffPayload, StudioResult } from "../model/types.js";

const HANDOFF_PREFIX = "studio:handoff:";
const APPLY_TYPE = "studio:apply";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function writeHandoff(payload: HandoffPayload): string {
  const id = generateId();
  window.sessionStorage.setItem(HANDOFF_PREFIX + id, JSON.stringify(payload));
  return id;
}

/** Read the handoff payload. Idempotent — call clearHandoff(id) when done. */
export function readHandoff(id: string): HandoffPayload | null {
  const raw = window.sessionStorage.getItem(HANDOFF_PREFIX + id);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as HandoffPayload;
  } catch {
    return null;
  }
}

export function clearHandoff(id: string): void {
  window.sessionStorage.removeItem(HANDOFF_PREFIX + id);
}

export function writeResult(id: string, result: StudioResult): void {
  if (window.opener) {
    window.opener.postMessage(
      { type: APPLY_TYPE, id, result },
      window.location.origin,
    );
  }
}

/**
 * Listen one-shot for an apply message matching `id`. Returns a detach function
 * in case the caller wants to cancel before the message arrives.
 */
export function onResult(
  id: string,
  callback: (result: StudioResult) => void,
): () => void {
  const handler = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data as {
      type?: string;
      id?: string;
      result?: StudioResult;
    } | null;
    if (!data || data.type !== APPLY_TYPE || data.id !== id) return;
    window.removeEventListener("message", handler);
    if (data.result) callback(data.result);
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
