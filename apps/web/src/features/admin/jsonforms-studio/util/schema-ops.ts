import type { JsonSchema, UISchemaElement } from "@jsonforms/core";
import type {
  FieldType,
  LayoutType,
  RendererKey,
  SchemaDoc,
  StudioPath,
  UiSchemaDoc,
} from "../model/types.js";

/* ──────────────────────────── tree helpers ──────────────────────────── */

function clone<T>(value: T): T {
  return structuredClone(value);
}

function getElements(node: UISchemaElement): UISchemaElement[] | undefined {
  return (node as { elements?: UISchemaElement[] }).elements;
}

function setElements(
  node: UISchemaElement,
  elements: UISchemaElement[],
): void {
  (node as { elements?: UISchemaElement[] }).elements = elements;
}

/** Walk to the parent of `path` and return [parent, lastIndex]. */
function walkToParent(
  root: UiSchemaDoc,
  path: StudioPath,
): { parent: UISchemaElement; index: number } {
  if (path.length === 0) {
    throw new Error("walkToParent: cannot walk to parent of root");
  }
  let parent: UISchemaElement = root;
  for (let i = 0; i < path.length - 1; i++) {
    const elements = getElements(parent);
    if (!elements) {
      throw new Error(`walkToParent: no elements at depth ${i}`);
    }
    parent = elements[path[i]];
  }
  return { parent, index: path[path.length - 1] };
}

export function getNodeAt(
  root: UiSchemaDoc,
  path: StudioPath,
): UISchemaElement | undefined {
  let node: UISchemaElement | undefined = root;
  for (const idx of path) {
    if (!node) return undefined;
    const elements = getElements(node);
    if (!elements) return undefined;
    node = elements[idx];
  }
  return node;
}

/* ──────────────────────────── insert / remove / move ──────────────────────────── */

export function insertNode(
  uiSchema: UiSchemaDoc,
  parentPath: StudioPath,
  index: number,
  newNode: UISchemaElement,
): UiSchemaDoc {
  const next = clone(uiSchema);
  const parent =
    parentPath.length === 0 ? next : (getNodeAt(next, parentPath) as UISchemaElement);
  if (!parent) throw new Error("insertNode: parent not found");
  const elements = getElements(parent) ?? [];
  const clampedIndex = Math.max(0, Math.min(index, elements.length));
  const updated = [...elements];
  updated.splice(clampedIndex, 0, newNode);
  setElements(parent, updated);
  return next;
}

export function removeNode(
  uiSchema: UiSchemaDoc,
  path: StudioPath,
): UiSchemaDoc {
  if (path.length === 0) throw new Error("removeNode: cannot remove root");
  const next = clone(uiSchema);
  const { parent, index } = walkToParent(next, path);
  const elements = getElements(parent);
  if (!elements) throw new Error("removeNode: parent has no elements");
  const updated = [...elements];
  updated.splice(index, 1);
  setElements(parent, updated);
  return next;
}

/* ──────────────────────────── delete with schema cleanup ──────────────────────────── */

const SCOPE_RE = /^#\/(.+)$/;

/** Recursively collect every `scope` string from a UI subtree. */
export function collectScopes(node: UISchemaElement): string[] {
  const out: string[] = [];
  const asAny = node as {
    type?: string;
    scope?: string;
    elements?: UISchemaElement[];
  };
  if (asAny.type === "Control" && typeof asAny.scope === "string") {
    out.push(asAny.scope);
  }
  if (asAny.elements) {
    for (const child of asAny.elements) out.push(...collectScopes(child));
  }
  return out;
}

/**
 * Remove the property referenced by `scope` from the schema (mutating `schema`).
 * Walks to the parent `properties` container, deletes the leaf key, and removes
 * it from the parent `required` array if present. No-op on malformed/unresolved
 * pointers.
 */
export function removePropertyByScope(schema: SchemaDoc, scope: string): void {
  const match = SCOPE_RE.exec(scope);
  if (!match) return;
  const segments = match[1].split("/").map((s) => decodeURIComponent(s));
  // We expect pairs of ["properties", "<key>"]. Walk to the parent of the leaf.
  let cursor: unknown = schema;
  for (let i = 0; i < segments.length - 1; i++) {
    if (cursor === null || typeof cursor !== "object") return;
    cursor = (cursor as Record<string, unknown>)[segments[i]];
    if (cursor === undefined) return;
  }
  if (cursor === null || typeof cursor !== "object") return;
  const leafKey = segments[segments.length - 1];
  const parentSegment = segments[segments.length - 2];
  // Only touch the `properties` bag (not e.g. `items`, `definitions`).
  if (parentSegment !== "properties") return;
  const propsBag = cursor as Record<string, unknown>;
  if (!(leafKey in propsBag)) return;
  delete propsBag[leafKey];
  // Remove from `required` on the grandparent schema object.
  // cursor is the `properties` object; its parent schema is two segments up.
  let grandparent: unknown = schema;
  for (let i = 0; i < segments.length - 2; i++) {
    if (grandparent === null || typeof grandparent !== "object") return;
    grandparent = (grandparent as Record<string, unknown>)[segments[i]];
    if (grandparent === undefined) return;
  }
  if (grandparent && typeof grandparent === "object") {
    const gp = grandparent as { required?: string[] };
    if (Array.isArray(gp.required)) {
      const filtered = gp.required.filter((k) => k !== leafKey);
      if (filtered.length === 0) {
        delete gp.required;
      } else {
        gp.required = filtered;
      }
    }
  }
}

export interface RemoveNodeWithSchemaResult {
  schema: SchemaDoc;
  uiSchema: UiSchemaDoc;
}

/**
 * Remove a UI node and clean up any bound schema properties that no other
 * Control in the remaining tree still references.
 */
export function removeNodeWithSchema(
  schema: SchemaDoc,
  uiSchema: UiSchemaDoc,
  path: StudioPath,
): RemoveNodeWithSchemaResult {
  if (path.length === 0) {
    throw new Error("removeNodeWithSchema: cannot remove root");
  }
  const nextSchema = clone(schema);
  const nextUi = clone(uiSchema);
  const { parent, index } = walkToParent(nextUi, path);
  const elements = getElements(parent);
  if (!elements) {
    throw new Error("removeNodeWithSchema: parent has no elements");
  }
  const removedNode = elements[index];
  const removedScopes = removedNode ? collectScopes(removedNode) : [];
  const updated = [...elements];
  updated.splice(index, 1);
  setElements(parent, updated);

  const remainingScopes = new Set(collectScopes(nextUi));
  for (const scope of removedScopes) {
    if (!remainingScopes.has(scope)) {
      removePropertyByScope(nextSchema, scope);
    }
  }
  return { schema: nextSchema, uiSchema: nextUi };
}

export function moveNode(
  uiSchema: UiSchemaDoc,
  fromPath: StudioPath,
  toParentPath: StudioPath,
  toIndex: number,
): UiSchemaDoc {
  if (fromPath.length === 0) throw new Error("moveNode: cannot move root");
  const node = getNodeAt(uiSchema, fromPath);
  if (!node) throw new Error("moveNode: source not found");
  const removed = removeNode(uiSchema, fromPath);
  // If removal happened in the same parent before our destination index, adjust.
  let adjustedIndex = toIndex;
  const sameParent =
    fromPath.length - 1 === toParentPath.length &&
    fromPath.slice(0, -1).every((v, i) => v === toParentPath[i]);
  if (sameParent && fromPath[fromPath.length - 1] < toIndex) {
    adjustedIndex = toIndex - 1;
  }
  return insertNode(removed, toParentPath, adjustedIndex, node);
}

/* ──────────────────────────── new field (atomic schema + uiSchema) ──────────────────────────── */

function uniqueKey(schema: SchemaDoc, base: string): string {
  const props = schema.properties ?? {};
  if (!(base in props)) return base;
  let n = 1;
  while (`${base}_${n}` in props) n++;
  return `${base}_${n}`;
}

export function buildLeafSchema(fieldType: FieldType): JsonSchema {
  switch (fieldType) {
    case "string":
    case "richtext":
    case "multiline":
      return { type: "string" };
    case "number":
      return { type: "number" };
    case "integer":
      return { type: "integer" };
    case "boolean":
      return { type: "boolean" };
    case "date":
      return { type: "string", format: "date" };
    case "enum":
      return { type: "string", enum: ["option1", "option2"] };
    case "json":
      return { type: "object" };
    case "objectArray":
      return {
        type: "array",
        items: { type: "object", properties: {} },
      };
    case "faqArray":
      return {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
          },
          required: ["question", "answer"],
        },
      };
  }
}

export function buildControlOptions(
  fieldType: FieldType,
): Record<string, unknown> | undefined {
  switch (fieldType) {
    case "richtext":
      return { format: "richtext" };
    case "multiline":
      return { multi: true };
    case "json":
      return { format: "json" };
    case "faqArray":
      return {
        format: "accordion",
        accordionTriggerScope: "#/properties/question",
      };
    default:
      return undefined;
  }
}

export interface AddNewFieldResult {
  schema: SchemaDoc;
  uiSchema: UiSchemaDoc;
  propertyKey: string;
}

export function addNewField(
  schema: SchemaDoc,
  uiSchema: UiSchemaDoc,
  parentPath: StudioPath,
  index: number,
  fieldType: FieldType,
): AddNewFieldResult {
  const nextSchema = clone(schema);
  if (!nextSchema.properties) nextSchema.properties = {};
  const key = uniqueKey(nextSchema, "field");
  nextSchema.properties[key] = buildLeafSchema(fieldType);

  const options = buildControlOptions(fieldType);
  const control: UISchemaElement = {
    type: "Control",
    scope: `#/properties/${key}`,
    ...(options ? { options } : {}),
  } as UISchemaElement;

  const nextUi = insertNode(uiSchema, parentPath, index, control);

  // FAQ array needs an inline item uischema so the answer renders as rich text
  if (fieldType === "faqArray") {
    const inserted = getNodeAt(nextUi, [...parentPath, index]) as {
      options?: Record<string, unknown>;
    } | undefined;
    if (inserted?.options) {
      inserted.options.detail = {
        type: "VerticalLayout",
        elements: [
          { type: "Control", scope: "#/properties/question", label: "Question" },
          {
            type: "Control",
            scope: "#/properties/answer",
            label: "Answer",
            options: { format: "richtext" },
          },
        ],
      };
    }
  }

  return { schema: nextSchema, uiSchema: nextUi, propertyKey: key };
}

/* ──────────────────────────── layouts / custom renderers ──────────────────────────── */

export function buildLayoutNode(layoutType: LayoutType): UISchemaElement {
  if (layoutType === "Categorization") {
    return {
      type: "Categorization",
      elements: [
        { type: "Category", label: "Category 1", elements: [] },
        { type: "Category", label: "Category 2", elements: [] },
      ],
    } as unknown as UISchemaElement;
  }
  if (layoutType === "Category") {
    return { type: "Category", label: "Category", elements: [] } as unknown as UISchemaElement;
  }
  if (layoutType === "Group") {
    return { type: "Group", label: "Group", elements: [] } as unknown as UISchemaElement;
  }
  return { type: layoutType, elements: [] } as unknown as UISchemaElement;
}

export function buildCustomRendererControl(
  rendererKey: RendererKey,
  scope: string,
): UISchemaElement {
  const opts: Record<string, unknown> = {};
  if (rendererKey === "richtext") opts.format = "richtext";
  else if (rendererKey === "json") opts.format = "json";
  else if (rendererKey === "multiline") opts.multi = true;
  else if (rendererKey === "asyncSelect") {
    opts.format = "asyncSelect";
    opts.asyncSelectUrl = "";
  } else if (rendererKey === "select") {
    opts.format = "select";
    opts.choices = [];
  }
  return { type: "Control", scope, options: opts } as UISchemaElement;
}

/**
 * Drop a custom-renderer Control into the uiSchema AND create a backing
 * schema property so the scope resolves. The property type is chosen to
 * match the renderer (object for json, string for everything else).
 */
export interface AddCustomRendererFieldResult {
  schema: SchemaDoc;
  uiSchema: UiSchemaDoc;
  propertyKey: string;
}

export function addCustomRendererField(
  schema: SchemaDoc,
  uiSchema: UiSchemaDoc,
  parentPath: StudioPath,
  index: number,
  rendererKey: RendererKey,
): AddCustomRendererFieldResult {
  const nextSchema = clone(schema);
  if (!nextSchema.properties) nextSchema.properties = {};
  const base =
    rendererKey === "asyncSelect"
      ? "asyncSelect"
      : rendererKey === "select"
        ? "select"
        : rendererKey === "richtext"
          ? "richText"
          : rendererKey === "multiline"
            ? "multiLine"
            : rendererKey === "json"
              ? "json"
              : "field";
  const key = uniqueKey(nextSchema, base);
  const leaf: JsonSchema = rendererKey === "json" ? { type: "object" } : { type: "string" };
  nextSchema.properties[key] = leaf;

  const control = buildCustomRendererControl(
    rendererKey,
    `#/properties/${key}`,
  );
  const nextUi = insertNode(uiSchema, parentPath, index, control);
  return { schema: nextSchema, uiSchema: nextUi, propertyKey: key };
}

/* ──────────────────────────── field type detection / change ──────────────────────────── */

export function detectFieldType(
  leaf: JsonSchema | undefined,
  controlOptions?: Record<string, unknown>,
): FieldType | undefined {
  if (!leaf || typeof leaf !== "object") return undefined;
  const t = (leaf as { type?: unknown }).type;
  const format = (leaf as { format?: unknown }).format;
  const hasEnum = Array.isArray((leaf as { enum?: unknown }).enum);
  const optFormat = controlOptions?.format;
  const optMulti = controlOptions?.multi;
  if (t === "string") {
    if (optFormat === "richtext") return "richtext";
    if (optMulti === true) return "multiline";
    if (format === "date") return "date";
    if (hasEnum) return "enum";
    return "string";
  }
  if (t === "number") return "number";
  if (t === "integer") return "integer";
  if (t === "boolean") return "boolean";
  if (t === "object") return "json";
  if (t === "array") {
    if (optFormat === "accordion") return "faqArray";
    return "objectArray";
  }
  return undefined;
}

export interface ChangePropertyTypeResult {
  schema: SchemaDoc;
  uiSchema: UiSchemaDoc;
}

/**
 * Replace the schema leaf for `key` with a new shape matching `fieldType`,
 * and update every bound Control's `options` to match the new renderer.
 * Non-type-related options on existing controls are dropped.
 */
export function changePropertyType(
  schema: SchemaDoc,
  uiSchema: UiSchemaDoc,
  key: string,
  fieldType: FieldType,
): ChangePropertyTypeResult {
  const nextSchema = clone(schema);
  if (!nextSchema.properties) nextSchema.properties = {};
  nextSchema.properties[key] = buildLeafSchema(fieldType);

  const nextOptions = buildControlOptions(fieldType);
  const nextUi = clone(uiSchema);
  const targetScope = `#/properties/${key}`;
  const walk = (node: UISchemaElement): void => {
    const asAny = node as {
      type?: string;
      scope?: string;
      options?: Record<string, unknown>;
      elements?: UISchemaElement[];
    };
    if (asAny.type === "Control" && asAny.scope === targetScope) {
      if (nextOptions) {
        asAny.options = { ...nextOptions };
      } else {
        delete asAny.options;
      }
    }
    if (asAny.elements) for (const child of asAny.elements) walk(child);
  };
  walk(nextUi);
  return { schema: nextSchema, uiSchema: nextUi };
}

/* ──────────────────────────── rename property (with scope rewrite) ──────────────────────────── */

const SCOPE_PROP_RE = /^#\/properties\/([^/]+)(.*)$/;

function rewriteScopes(
  node: UISchemaElement,
  oldKey: string,
  newKey: string,
): UISchemaElement {
  const next = clone(node);
  walkAndRewrite(next, oldKey, newKey);
  return next;
}

function walkAndRewrite(
  node: UISchemaElement,
  oldKey: string,
  newKey: string,
): void {
  const asAny = node as { type?: string; scope?: string; elements?: UISchemaElement[] };
  if (asAny.type === "Control" && typeof asAny.scope === "string") {
    const match = SCOPE_PROP_RE.exec(asAny.scope);
    if (match && match[1] === oldKey) {
      asAny.scope = `#/properties/${newKey}${match[2]}`;
    }
  }
  if (asAny.elements) {
    for (const child of asAny.elements) walkAndRewrite(child, oldKey, newKey);
  }
}

export interface RenamePropertyResult {
  schema: SchemaDoc;
  uiSchema: UiSchemaDoc;
}

export function renameProperty(
  schema: SchemaDoc,
  uiSchema: UiSchemaDoc,
  oldKey: string,
  newKey: string,
): RenamePropertyResult {
  if (oldKey === newKey) return { schema, uiSchema };
  if (!schema.properties || !(oldKey in schema.properties)) {
    throw new Error(`renameProperty: ${oldKey} not in schema`);
  }
  if (newKey in schema.properties) {
    throw new Error(`renameProperty: ${newKey} already exists`);
  }
  const nextSchema = clone(schema);
  const props = nextSchema.properties as Record<string, JsonSchema>;
  props[newKey] = props[oldKey];
  delete props[oldKey];
  if (nextSchema.required) {
    nextSchema.required = nextSchema.required.map((k) =>
      k === oldKey ? newKey : k,
    );
  }
  const nextUi = rewriteScopes(uiSchema, oldKey, newKey) as UiSchemaDoc;
  return { schema: nextSchema, uiSchema: nextUi };
}
