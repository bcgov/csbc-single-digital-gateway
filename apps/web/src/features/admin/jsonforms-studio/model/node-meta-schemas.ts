import type { JsonSchema, UISchemaElement } from "@jsonforms/core";
import type { NodeKind } from "./types.js";

export interface MetaSchemaPair {
  schema: JsonSchema;
  uiSchema: UISchemaElement;
}

const controlMeta: MetaSchemaPair = {
  schema: {
    type: "object",
    properties: {
      label: { type: "string" },
      options: { type: "object" },
    },
  },
  uiSchema: {
    type: "VerticalLayout",
    elements: [
      { type: "Control", scope: "#/properties/label" },
      {
        type: "Control",
        scope: "#/properties/options",
        label: "Options",
        options: { format: "json", height: "180px" },
      },
    ],
  } as UISchemaElement,
};

const asyncSelectMeta: MetaSchemaPair = {
  schema: {
    type: "object",
    properties: {
      label: { type: "string" },
      options: {
        type: "object",
        properties: {
          asyncSelectUrl: { type: "string", title: "Data URL" },
          asyncSelectKey: {
            type: "string",
            title: "Registered loader key (optional)",
          },
          placeholder: { type: "string" },
          asyncSelectMapping: {
            type: "object",
            properties: {
              results: { type: "string", title: "Results path (e.g. docs)" },
              value: { type: "string", title: "Value field" },
              label: { type: "string", title: "Label field" },
            },
          },
        },
      },
    },
  },
  uiSchema: {
    type: "VerticalLayout",
    elements: [
      { type: "Control", scope: "#/properties/label" },
      { type: "Control", scope: "#/properties/options/properties/asyncSelectUrl" },
      { type: "Control", scope: "#/properties/options/properties/asyncSelectKey" },
      { type: "Control", scope: "#/properties/options/properties/placeholder" },
      {
        type: "Control",
        scope: "#/properties/options/properties/asyncSelectMapping/properties/results",
      },
      {
        type: "Control",
        scope: "#/properties/options/properties/asyncSelectMapping/properties/value",
      },
      {
        type: "Control",
        scope: "#/properties/options/properties/asyncSelectMapping/properties/label",
      },
    ],
  } as UISchemaElement,
};

const selectMeta: MetaSchemaPair = {
  schema: {
    type: "object",
    properties: {
      label: { type: "string" },
      options: {
        type: "object",
        properties: {
          placeholder: { type: "string" },
          isMulti: { type: "boolean" },
          choices: {
            type: "array",
            title: "Choices",
            items: {
              type: "object",
              properties: {
                value: { type: "string" },
                label: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  uiSchema: {
    type: "VerticalLayout",
    elements: [
      { type: "Control", scope: "#/properties/label" },
      { type: "Control", scope: "#/properties/options/properties/placeholder" },
      { type: "Control", scope: "#/properties/options/properties/isMulti" },
      {
        type: "Control",
        scope: "#/properties/options/properties/choices",
        label: "Choices",
      },
    ],
  } as UISchemaElement,
};

const labeledLayoutMeta: MetaSchemaPair = {
  schema: {
    type: "object",
    properties: {
      label: { type: "string" },
    },
  },
  uiSchema: {
    type: "VerticalLayout",
    elements: [{ type: "Control", scope: "#/properties/label" }],
  } as UISchemaElement,
};

const unlabeledLayoutMeta: MetaSchemaPair = {
  schema: { type: "object", properties: {} },
  uiSchema: { type: "VerticalLayout", elements: [] } as UISchemaElement,
};

const LABELED_LAYOUTS = new Set<NodeKind>([
  "Group",
  "Category",
  "Categorization",
]);

function controlFormat(node: UISchemaElement | undefined): string | undefined {
  if (!node) return undefined;
  const asAny = node as { type?: string; options?: { format?: string } };
  return asAny.type === "Control" ? asAny.options?.format : undefined;
}

export function isAsyncSelectControl(node: UISchemaElement | undefined): boolean {
  return controlFormat(node) === "asyncSelect";
}

export function isSelectControl(node: UISchemaElement | undefined): boolean {
  return controlFormat(node) === "select";
}

export function getMetaSchema(
  kind: NodeKind,
  node?: UISchemaElement,
): MetaSchemaPair {
  if (kind === "Control") {
    if (isAsyncSelectControl(node)) return asyncSelectMeta;
    if (isSelectControl(node)) return selectMeta;
    return controlMeta;
  }
  if (LABELED_LAYOUTS.has(kind)) return labeledLayoutMeta;
  return unlabeledLayoutMeta;
}

export function detectKind(element: UISchemaElement): NodeKind {
  const t = (element as { type?: string }).type;
  if (t === "Control") return "Control";
  if (t === "HorizontalLayout") return "HorizontalLayout";
  if (t === "Group") return "Group";
  if (t === "Categorization") return "Categorization";
  if (t === "Category") return "Category";
  return "VerticalLayout";
}
