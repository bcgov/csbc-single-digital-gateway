import { useDroppable } from "@dnd-kit/core";
import type { UISchemaElement } from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import { repoAjv, repoCells, repoRenderers } from "@repo/jsonforms";
import { useEffect, useMemo } from "react";
import type { StudioPath } from "../model/types.js";
import { useStudioStore } from "../state/studio-store.js";
import { dropIdFor } from "../util/drop-id.js";
import {
  CanvasPathContext,
  canvasChromeRenderer,
} from "./canvas-chrome-renderer.js";

function DropSlot({ parentPath, index }: { parentPath: StudioPath; index: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropIdFor(parentPath, index),
  });
  return (
    <div
      ref={setNodeRef}
      data-cy={`drop-${parentPath.join(".")}-${index}`}
      className={[
        "relative z-10 h-4 rounded transition-colors",
        isOver ? "bg-bcgov-blue/40" : "bg-transparent",
      ].join(" ")}
    />
  );
}

export function Canvas() {
  const uiSchema = useStudioStore((s) => s.uiSchema);
  const schema = useStudioStore((s) => s.schema);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const readonly = useStudioStore((s) => s.readonly);

  useEffect(() => {
    if (readonly) return;
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, readonly]);

  const previewSchema = useMemo(() => schema as unknown as Record<string, unknown>, [schema]);
  const previewUi = useMemo(() => uiSchema as unknown as UISchemaElement, [uiSchema]);

  const rootElements = (uiSchema as { elements?: unknown[] }).elements;
  const isEmpty = Array.isArray(rootElements) && rootElements.length === 0;

  return (
    <main
      data-cy="studio-canvas"
      className="flex h-full flex-1 flex-col gap-4 overflow-y-auto bg-background p-6 pt-8"
    >
      {isEmpty ? (
        <div className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          <p className="mb-2">Drop a layout or field here to start.</p>
          <DropSlot parentPath={[]} index={0} />
        </div>
      ) : (
        <CanvasPathContext.Provider value={[]}>
          <JsonForms
            schema={previewSchema}
            uischema={previewUi}
            data={{}}
            ajv={repoAjv}
            renderers={[...repoRenderers, canvasChromeRenderer]}
            cells={repoCells}
            config={{ asyncSelectLoaders: {} }}
            readonly
            onChange={() => {}}
          />
        </CanvasPathContext.Provider>
      )}
    </main>
  );
}
