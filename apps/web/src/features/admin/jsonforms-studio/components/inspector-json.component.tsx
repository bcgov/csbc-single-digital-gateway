import type { UISchemaElement } from "@jsonforms/core";
import { JsonInput } from "@repo/ui";
import { useState } from "react";
import type { SchemaDoc } from "../model/types.js";
import { useStudioStore } from "../state/studio-store.js";

interface Props {
  node: UISchemaElement;
  /** Stable identity for the selected node — when this changes, the editor resets. */
  resetKey: string;
}

function InspectorJsonInner({ node }: { node: UISchemaElement }) {
  const replaceSelectedSubtree = useStudioStore((s) => s.replaceSelectedSubtree);
  const replaceSchema = useStudioStore((s) => s.replaceSchema);
  const readonly = useStudioStore((s) => s.readonly);
  const schema = useStudioStore((s) => s.schema);
  const [uiValue, setUiValue] = useState<Record<string, unknown> | undefined>(
    () => node as unknown as Record<string, unknown>,
  );
  const [schemaValue, setSchemaValue] = useState<Record<string, unknown> | undefined>(
    () => schema as unknown as Record<string, unknown>,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Schema
        </span>
        <JsonInput
          value={schemaValue}
          onChange={(next) => {
            setSchemaValue(next);
            if (readonly || !next) return;
            replaceSchema(next as unknown as SchemaDoc);
          }}
          disabled={readonly}
          height="240px"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          UI Schema
        </span>
        <JsonInput
          value={uiValue}
          onChange={(next) => {
            setUiValue(next);
            if (readonly || !next) return;
            replaceSelectedSubtree(next as unknown as UISchemaElement);
          }}
          disabled={readonly}
          height="320px"
        />
      </div>
    </div>
  );
}

export function InspectorJson({ node, resetKey }: Props) {
  // Remount on selection change to avoid setState-in-effect
  return <InspectorJsonInner key={resetKey} node={node} />;
}
