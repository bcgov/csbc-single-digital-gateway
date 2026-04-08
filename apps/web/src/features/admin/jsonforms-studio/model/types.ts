import type { JsonSchema, UISchemaElement } from "@jsonforms/core";

export type SchemaDoc = JsonSchema & {
  type: "object";
  properties?: Record<string, JsonSchema>;
  required?: string[];
};

export type UiSchemaDoc = UISchemaElement & {
  elements?: UISchemaElement[];
};

/** Path of indices into successive `elements[]` arrays in the uiSchema tree.
 *  An empty path refers to the root. */
export type StudioPath = number[];

export interface StudioNode {
  path: StudioPath;
  element: UISchemaElement;
}

export interface HandoffPayload {
  schema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
  readonly: boolean;
}

export interface StudioResult {
  schema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
}

export type LayoutType =
  | "VerticalLayout"
  | "HorizontalLayout"
  | "Group"
  | "Categorization"
  | "Category";

export type FieldType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "date"
  | "enum"
  | "richtext"
  | "json"
  | "multiline"
  | "objectArray";

export type RendererKey = "richtext" | "asyncSelect" | "select" | "json" | "multiline";

export type PaletteItem =
  | { kind: "layout"; layoutType: LayoutType }
  | { kind: "new-field"; fieldType: FieldType }
  | { kind: "bound-control"; propertyPath: string }
  | { kind: "custom-renderer"; rendererKey: RendererKey };

export type NodeKind =
  | "VerticalLayout"
  | "HorizontalLayout"
  | "Group"
  | "Categorization"
  | "Category"
  | "Control";

export interface ScopeIssue {
  path: StudioPath;
  scope: string | undefined;
  reason: "missing-scope" | "unresolved" | "malformed";
}
