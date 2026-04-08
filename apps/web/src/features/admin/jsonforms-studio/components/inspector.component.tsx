import { Button, Empty, EmptyDescription, EmptyTitle } from "@repo/ui";
import { useState } from "react";
import { getNodeAt } from "../util/schema-ops.js";
import { useStudioStore } from "../state/studio-store.js";
import { InspectorForm } from "./inspector-form.component.js";
import { InspectorJson } from "./inspector-json.component.js";

type View = "form" | "json";

export function Inspector() {
  const selection = useStudioStore((s) => s.selection);
  const uiSchema = useStudioStore((s) => s.uiSchema);
  const [view, setView] = useState<View>("form");

  const node = selection ? getNodeAt(uiSchema, selection) : undefined;

  return (
    <aside
      data-cy="studio-inspector"
      className="flex h-full w-80 flex-col gap-3 overflow-y-auto border-l border-border bg-muted/30 p-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Inspector
        </h2>
        <div className="flex rounded border border-border" role="tablist">
          <Button
            type="button"
            size="sm"
            variant={view === "form" ? "default" : "ghost"}
            onClick={() => setView("form")}
            data-cy="inspector-view-form"
          >
            Form
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "json" ? "default" : "ghost"}
            onClick={() => setView("json")}
            data-cy="inspector-view-json"
          >
            JSON
          </Button>
        </div>
      </div>

      {!node ? (
        <Empty>
          <EmptyTitle>No selection</EmptyTitle>
          <EmptyDescription>Click a node in the canvas to edit it.</EmptyDescription>
        </Empty>
      ) : (
        (() => {
          const key = (selection ?? []).join(".");
          return view === "form" ? (
            <InspectorForm key={key} node={node} />
          ) : (
            <InspectorJson key={key} node={node} resetKey={key} />
          );
        })()
      )}
    </aside>
  );
}
