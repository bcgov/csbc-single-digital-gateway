import type { JsonSchema, UISchemaElement } from "@jsonforms/core";
import type {
  ScopeIssue,
  SchemaDoc,
  StudioPath,
  UiSchemaDoc,
} from "../model/types.js";

const SCOPE_RE = /^#\/(.+)$/;

/** Resolve a JSON pointer like `#/properties/foo/properties/bar`. */
export function resolveScope(
  schema: SchemaDoc,
  scope: string,
): JsonSchema | undefined {
  const match = SCOPE_RE.exec(scope);
  if (!match) return undefined;
  const segments = match[1].split("/");
  let cursor: unknown = schema;
  for (const seg of segments) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[decodeURIComponent(seg)];
    if (cursor === undefined) return undefined;
  }
  return cursor as JsonSchema;
}

export function validateScopes(
  schema: SchemaDoc,
  uiSchema: UiSchemaDoc,
): ScopeIssue[] {
  const issues: ScopeIssue[] = [];
  walk(uiSchema, [], schema, issues);
  return issues;
}

function walk(
  node: UISchemaElement,
  path: StudioPath,
  schema: SchemaDoc,
  issues: ScopeIssue[],
): void {
  const asAny = node as {
    type?: string;
    scope?: string;
    elements?: UISchemaElement[];
  };

  if (asAny.type === "Control") {
    const scope = asAny.scope;
    if (typeof scope !== "string" || scope.length === 0) {
      issues.push({ path, scope, reason: "missing-scope" });
    } else if (!SCOPE_RE.test(scope)) {
      issues.push({ path, scope, reason: "malformed" });
    } else if (resolveScope(schema, scope) === undefined) {
      issues.push({ path, scope, reason: "unresolved" });
    }
  }

  if (asAny.elements) {
    asAny.elements.forEach((child, i) => walk(child, [...path, i], schema, issues));
  }
}
