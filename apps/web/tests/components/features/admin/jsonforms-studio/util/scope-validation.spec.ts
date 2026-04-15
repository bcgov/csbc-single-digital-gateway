import type { UISchemaElement } from "@jsonforms/core";
import type { SchemaDoc, UiSchemaDoc } from "../../../../../../src/features/admin/jsonforms-studio/model/types";
import { resolveScope, validateScopes } from "../../../../../../src/features/admin/jsonforms-studio/util/scope-validation";

const schema: SchemaDoc = {
  type: "object",
  properties: {
    name: { type: "string" },
    address: {
      type: "object",
      properties: { city: { type: "string" } },
    },
  },
};

const ui = (elements: UISchemaElement[]): UiSchemaDoc =>
  ({ type: "VerticalLayout", elements }) as unknown as UiSchemaDoc;

describe("jsonforms-studio / scope-validation", () => {
  describe("validateScopes", () => {
    it("should return an empty array when every Control scope resolves", () => {
      const issues = validateScopes(schema, ui([{ type: "Control", scope: "#/properties/name" } as UISchemaElement]));
      expect(issues).toHaveLength(0);
    });

    it("should flag a Control whose scope points to a missing property", () => {
      const issues = validateScopes(schema, ui([{ type: "Control", scope: "#/properties/missing" } as UISchemaElement]));
      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe("unresolved");
    });

    it("should flag multiple dangling Controls and return all of them", () => {
      const issues = validateScopes(schema, ui([
        { type: "Control", scope: "#/properties/missing1" } as UISchemaElement,
        { type: "Control", scope: "#/properties/missing2" } as UISchemaElement,
      ]));
      expect(issues).toHaveLength(2);
    });

    it("should accept nested scopes like #/properties/address/properties/city", () => {
      const issues = validateScopes(schema, ui([
        { type: "Control", scope: "#/properties/address/properties/city" } as UISchemaElement,
      ]));
      expect(issues).toHaveLength(0);
    });

    it("should treat a Control with no scope as invalid", () => {
      const issues = validateScopes(schema, ui([{ type: "Control" } as UISchemaElement]));
      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe("missing-scope");
    });
  });

  describe("resolveScope", () => {
    it("should return the referenced sub-schema for a valid pointer", () => {
      const sub = resolveScope(schema, "#/properties/name");
      expect(sub).toEqual({ type: "string" });
    });

    it("should return undefined for a malformed pointer", () => {
      expect(resolveScope(schema, "not-a-pointer")).toBeUndefined();
    });
  });
});
