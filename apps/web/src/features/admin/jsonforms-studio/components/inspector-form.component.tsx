import type { UISchemaElement } from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import { repoAjv, repoCells, repoRenderers } from "@repo/jsonforms";
import { useMemo, useState } from "react";
import type { FieldType } from "../model/types.js";
import { detectKind, getMetaSchema } from "../model/node-meta-schemas.js";
import { useStudioStore } from "../state/studio-store.js";
import { detectFieldType } from "../util/schema-ops.js";
import { CategorizationCategories } from "./categorization-categories.component.js";

interface Props {
  node: UISchemaElement;
}

const SCOPE_PREFIX = "#/properties/";

function extractPropertyKey(scope: string | undefined): string {
  if (!scope || !scope.startsWith(SCOPE_PREFIX)) return "";
  return scope.slice(SCOPE_PREFIX.length);
}

export function InspectorForm({ node }: Props) {
  const replaceSelectedSubtree = useStudioStore((s) => s.replaceSelectedSubtree);
  const renamePropertyKey = useStudioStore((s) => s.renamePropertyKey);
  const changePropertyType = useStudioStore((s) => s.changePropertyType);
  const schema = useStudioStore((s) => s.schema);
  const readonly = useStudioStore((s) => s.readonly);
  const kind = detectKind(node);
  const meta = useMemo(() => getMetaSchema(kind, node), [kind, node]);
  const availableProperties = useMemo(
    () => Object.keys(schema.properties ?? {}),
    [schema],
  );

  // Local copy so JsonForms re-renders predictably without rebuilding the store on every keystroke.
  const [data, setData] = useState<Record<string, unknown>>(() => ({ ...(node as unknown as Record<string, unknown>) }));

  const currentKey = extractPropertyKey((node as { scope?: string }).scope);
  const [propertyKeyDraft, setPropertyKeyDraft] = useState(currentKey);

  const currentLeaf = currentKey ? schema.properties?.[currentKey] : undefined;
  const currentOptions = (node as { options?: Record<string, unknown> }).options;
  const currentFieldType = detectFieldType(currentLeaf, currentOptions);
  const FIELD_TYPE_CHOICES: Array<{ value: FieldType; label: string }> = [
    { value: "string", label: "String" },
    { value: "multiline", label: "Multiline text" },
    { value: "richtext", label: "Rich text" },
    { value: "number", label: "Number" },
    { value: "integer", label: "Integer" },
    { value: "boolean", label: "Boolean" },
    { value: "date", label: "Date" },
    { value: "enum", label: "Enum" },
    { value: "json", label: "JSON (object)" },
    { value: "objectArray", label: "Object array" },
  ];

  // If selection changes to a different Control with a different scope, sync the draft.
  if (kind === "Control" && currentKey !== extractPropertyKey((data.scope as string) ?? undefined)) {
    // no-op: handled by key prop in parent on selection change
  }

  const onRebind = (nextKey: string) => {
    if (!nextKey || nextKey === currentKey) return;
    const merged = {
      ...(node as unknown as Record<string, unknown>),
      scope: `${SCOPE_PREFIX}${nextKey}`,
    };
    replaceSelectedSubtree(merged as unknown as UISchemaElement);
    setPropertyKeyDraft(nextKey);
  };

  const commitRename = () => {
    const trimmed = propertyKeyDraft.trim();
    if (!trimmed || trimmed === currentKey) {
      setPropertyKeyDraft(currentKey);
      return;
    }
    renamePropertyKey(currentKey, trimmed);
  };

  return (
    <div className="flex flex-col gap-3">
      {kind === "Control" && currentKey && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Property name
          </label>
          <input
            type="text"
            className="rounded border border-border bg-background px-2 py-1 text-sm"
            value={propertyKeyDraft}
            disabled={readonly}
            onChange={(e) => setPropertyKeyDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            data-cy="inspector-property-key"
          />
          <p className="text-[10px] text-muted-foreground">
            Renames the underlying schema property and updates all references.
          </p>
        </div>
      )}
      {kind === "Control" && currentKey && currentLeaf && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Field type
          </label>
          <select
            className="rounded border border-border bg-background px-2 py-1 text-sm"
            value={currentFieldType ?? ""}
            disabled={readonly}
            onChange={(e) => changePropertyType(currentKey, e.target.value as FieldType)}
            data-cy="inspector-field-type"
          >
            {currentFieldType === undefined && (
              <option value="">(unknown)</option>
            )}
            {FIELD_TYPE_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground">
            Changes the underlying schema type for this property.
          </p>
        </div>
      )}
      {kind === "Control" && availableProperties.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Bound property
          </label>
          <select
            className="rounded border border-border bg-background px-2 py-1 text-sm"
            value={currentKey}
            disabled={readonly}
            onChange={(e) => onRebind(e.target.value)}
            data-cy="inspector-bound-property"
          >
            {!availableProperties.includes(currentKey) && currentKey && (
              <option value={currentKey}>{currentKey} (unresolved)</option>
            )}
            {availableProperties.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground">
            Point this control at a different existing schema property.
          </p>
        </div>
      )}
      <div className="inspector-compact [&_[data-slot=field-group]]:!gap-2 [&_[data-slot=field]]:!gap-1 [&_input]:!h-7 [&_input]:!py-0 [&_input]:!text-xs [&_select]:!h-7 [&_select]:!py-0 [&_select]:!text-xs [&_textarea]:!text-xs [&_label]:!text-xs">
      <JsonForms
        schema={meta.schema}
        uischema={meta.uiSchema}
        data={data}
        ajv={repoAjv}
        renderers={repoRenderers}
        cells={repoCells}
        readonly={readonly}
        onChange={({ data: next }) => {
          setData(next as Record<string, unknown>);
          const merged = {
            ...(node as unknown as Record<string, unknown>),
            ...(next as Record<string, unknown>),
          };
          replaceSelectedSubtree(merged as unknown as UISchemaElement);
        }}
      />
      </div>
      {kind === "Categorization" && <CategorizationCategories node={node} />}
    </div>
  );
}
