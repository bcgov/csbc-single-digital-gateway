import type {
  ArrayLayoutProps,
  ControlElement,
  JsonSchema,
  UISchemaElement,
} from "@jsonforms/core";
import {
  composePaths,
  Generate,
  rankWith,
  Resolve,
  schemaMatches,
  uiTypeIs,
  and,
} from "@jsonforms/core";
import {
  JsonFormsDispatch,
  useJsonForms,
  withJsonFormsArrayLayoutProps,
} from "@jsonforms/react";
import {
  Button,
  Card,
  CardContent,
  FieldGroup,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function generateFilteredUiSchema(schema: JsonSchema): UISchemaElement {
  const generated = Generate.uiSchema(schema);
  if (
    generated.type === "VerticalLayout" &&
    "elements" in generated &&
    Array.isArray(generated.elements)
  ) {
    const hiddenProps = new Set<string>();
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const p = prop as JsonSchema;
        if (key === "id" || p.const !== undefined) {
          hiddenProps.add(key);
        }
      }
    }
    generated.elements = generated.elements.filter((el) => {
      if (el.type === "Control" && "scope" in el) {
        const scope = (el as ControlElement).scope;
        const prop = scope.replace("#/properties/", "");
        return !hiddenProps.has(prop);
      }
      return true;
    });
  }
  return generated;
}

function findMatchingIndex(
  oneOfSchemas: JsonSchema[],
  itemData: unknown,
): number {
  if (!itemData || typeof itemData !== "object") return -1;
  const data = itemData as Record<string, unknown>;

  for (let i = 0; i < oneOfSchemas.length; i++) {
    const variant = oneOfSchemas[i];
    if (variant?.properties?.["type"]) {
      const constVal = (variant.properties["type"] as JsonSchema).const;
      if (constVal !== undefined && data["type"] === constVal) {
        return i;
      }
    }
  }
  return -1;
}

function OneOfArrayLayoutRenderer({
  data,
  path,
  schema,
  uischema,
  enabled,
  visible,
  label,
  description,
  errors,
  required,
  addItem,
  removeItems,
  renderers,
  cells,
}: ArrayLayoutProps) {
  const ctx = useJsonForms();

  if (!visible) {
    return null;
  }

  const controlElement = uischema as ControlElement;
  const oneOfSchemas = (schema?.oneOf ?? (schema?.items as JsonSchema)?.oneOf) as
    | JsonSchema[]
    | undefined;

  if (!oneOfSchemas) {
    return null;
  }

  const itemCount = data ?? 0;

  const handleVariantChange = (index: number, value: string) => {
    const variantIndex = parseInt(value, 10);
    const variant = oneOfSchemas[variantIndex];
    if (!variant) return;

    const initial: Record<string, unknown> = {
      id: crypto.randomUUID(),
    };
    if (variant.properties?.["type"]) {
      initial.type = (variant.properties["type"] as JsonSchema).const;
    }

    const itemPath = composePaths(path, `${index}`);
    ctx.dispatch?.({
      type: "jsonforms/UPDATE",
      path: itemPath,
      updater: () => initial,
    } as never);
  };

  return (
    <FieldWrapper
      label={label}
      description={description}
      errors={errors}
      visible={visible}
      required={required}
    >
      <FieldGroup className="gap-2">
        {Array.from({ length: itemCount }, (_, index) => {
          const itemPath = composePaths(path, `${index}`);
          const itemData = Resolve.data(ctx.core?.data, itemPath);
          const matchingIndex = findMatchingIndex(oneOfSchemas, itemData);
          const selectedSchema =
            matchingIndex >= 0 ? oneOfSchemas[matchingIndex] : undefined;
          const selectedUiSchema = selectedSchema
            ? (controlElement.options?.detail as UISchemaElement | undefined) ??
              generateFilteredUiSchema(selectedSchema)
            : undefined;

          return (
            <Card key={index} className="py-2 gap-2">
              <CardContent className="p-2">
                <div className="flex items-start gap-1">
                  <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <Select
                      value={matchingIndex >= 0 ? String(matchingIndex) : ""}
                      onValueChange={(val) => { if (val) handleVariantChange(index, val); }}
                      disabled={!enabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {oneOfSchemas.map((variant, vi) => (
                          <SelectItem key={vi} value={String(vi)}>
                            {variant.title ?? `Option ${vi + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedSchema && selectedUiSchema && (
                      <JsonFormsDispatch
                        schema={selectedSchema}
                        uischema={selectedUiSchema}
                        path={itemPath}
                        enabled={enabled}
                        renderers={renderers}
                        cells={cells}
                      />
                    )}
                  </div>
                  {enabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Remove"
                      className="size-5 p-0 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeItems?.(path, [index])()}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {enabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem(path, { id: crypto.randomUUID() })}
          >
            + Add {label ? label.replace(/s$/, "") : "Item"}
          </Button>
        )}
      </FieldGroup>
    </FieldWrapper>
  );
}

const isOneOfArrayControl = and(
  uiTypeIs("Control"),
  schemaMatches(
    (schema) =>
      schema.type === "array" &&
      !!(schema.items as JsonSchema)?.oneOf,
  ),
);

export const oneOfArrayLayoutTester = rankWith(4, isOneOfArrayControl);
export const OneOfArrayLayout = withJsonFormsArrayLayoutProps(
  OneOfArrayLayoutRenderer,
);
export const oneOfArrayLayoutEntry = {
  tester: oneOfArrayLayoutTester,
  renderer: OneOfArrayLayout,
};
