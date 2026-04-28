import type { ControlElement, JsonSchema, UISchemaElement } from "@jsonforms/core";
import { Generate } from "@jsonforms/core";

/**
 * Generate a uiSchema for the given schema, filtering out hidden properties
 * (id fields and const-value fields like discriminator `type`).
 */
export function generateFilteredUiSchema(schema: JsonSchema): UISchemaElement {
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
