import type { StudioResult } from "../model/types.js";
import { onResult, writeHandoff } from "./handoff.js";

export interface OpenStudioArgs {
  schema: Record<string, unknown> | undefined;
  uiSchema: Record<string, unknown> | undefined;
  readonly: boolean;
  onApply: (result: StudioResult) => void;
}

/**
 * Open the JSONForms Studio in a new tab and resolve the apply callback when
 * the studio posts back. Returns a detach function to cancel the listener.
 */
export function openStudio(args: OpenStudioArgs): () => void {
  const id = writeHandoff({
    schema: args.schema ?? {},
    uiSchema: args.uiSchema ?? {},
    readonly: args.readonly,
  });
  const detach = onResult(id, args.onApply);
  const url = `/admin/studio?handoff=${encodeURIComponent(id)}`;
  // Intentionally omit "noopener" so the studio can postMessage back via window.opener.
  window.open(url, "_blank");
  return detach;
}
