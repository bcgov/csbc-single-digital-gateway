import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Alert, AlertDescription, AlertTitle, Button } from "@repo/ui";
import { useEffect, useMemo } from "react";
import type { PaletteItem, StudioPath } from "../model/types.js";
import { useStudioStore } from "../state/studio-store.js";
import { clearHandoff, readHandoff, writeResult } from "../util/handoff.js";
import { isSelfOrDescendant, parseDropId } from "../util/drop-id.js";
import { Canvas } from "./canvas.component.js";
import { Inspector } from "./inspector.component.js";
import { Palette } from "./palette.component.js";

interface Props {
  handoffId: string | null;
}

export function Studio({ handoffId }: Props) {
  const initialize = useStudioStore((s) => s.initialize);
  const reset = useStudioStore((s) => s.reset);
  const hydrated = useStudioStore((s) => s.hydrated);
  const readonly = useStudioStore((s) => s.readonly);
  const issues = useStudioStore((s) => s.issues);
  const canApply = useStudioStore((s) => s.canApply);
  const toResult = useStudioStore((s) => s.toResult);
  const applyPaletteItem = useStudioStore((s) => s.applyPaletteItem);
  const moveExisting = useStudioStore((s) => s.moveExisting);
  const clearHistoryStack = useStudioStore((s) => s.clearHistoryStack);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Hydrate from sessionStorage on mount, reset on unmount.
  // Note: readHandoff is idempotent (StrictMode-safe); the entry is cleared on Apply.
  useEffect(() => {
    if (!handoffId) return;
    const payload = readHandoff(handoffId);
    if (payload) initialize(payload);
    return () => reset();
  }, [handoffId, initialize, reset]);

  const error = useMemo(() => {
    if (!handoffId) return "Missing handoff id in URL.";
    if (handoffId && !hydrated) return "Handoff not found or expired. Re-open the Studio from the translation form.";
    return null;
  }, [handoffId, hydrated]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const drop = parseDropId(String(over.id));
    if (!drop) return;
    const data = active.data.current as
      | { palette?: PaletteItem; nodePath?: StudioPath }
      | undefined;
    if (data?.palette) {
      applyPaletteItem(data.palette, drop.parentPath, drop.index);
      return;
    }
    if (data?.nodePath) {
      if (isSelfOrDescendant(data.nodePath, drop.parentPath)) return;
      moveExisting(data.nodePath, drop.parentPath, drop.index);
    }
  };

  const onApply = () => {
    if (!handoffId) return;
    writeResult(handoffId, toResult());
    clearHandoff(handoffId);
    clearHistoryStack();
    if (window.opener) window.close();
  };

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Studio unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex h-screen flex-col" data-cy="studio-root">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold">JSONForms Studio</h1>
            {readonly && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                Readonly
              </span>
            )}
            {issues.length > 0 && (
              <span
                data-cy="issue-count"
                className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
              >
                {issues.length} unresolved scope{issues.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {!readonly && (
            <Button
              type="button"
              data-cy="studio-apply"
              onClick={onApply}
              disabled={!canApply()}
              className="bg-bcgov-blue hover:bg-bcgov-blue/80"
            >
              Apply &amp; close
            </Button>
          )}
        </header>
        <div className="flex flex-1 overflow-hidden">
          <Palette />
          <Canvas />
          <Inspector />
        </div>
      </div>
    </DndContext>
  );
}
