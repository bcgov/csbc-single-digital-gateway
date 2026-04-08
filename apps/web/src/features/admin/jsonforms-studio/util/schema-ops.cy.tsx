import type { UISchemaElement } from "@jsonforms/core";
import {
  addNewField,
  buildLayoutNode,
  insertNode,
  moveNode,
  removeNode,
  removeNodeWithSchema,
  renameProperty,
} from "./schema-ops";
import type { SchemaDoc, UiSchemaDoc } from "../model/types";

const baseSchema = (): SchemaDoc => ({
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
});

const baseUi = (): UiSchemaDoc =>
  ({
    type: "VerticalLayout",
    elements: [{ type: "Control", scope: "#/properties/name" }],
  }) as unknown as UiSchemaDoc;

describe("jsonforms-studio / schema-ops", () => {
  describe("insertNode", () => {
    it("should insert a Control at the end of a layout's elements", () => {
      const ui = baseUi();
      const next = insertNode(ui, [], 1, {
        type: "Control",
        scope: "#/properties/age",
      } as UISchemaElement);
      const elements = (next as unknown as { elements: UISchemaElement[] }).elements;
      expect(elements).to.have.length(2);
      expect((elements[1] as { scope: string }).scope).to.equal("#/properties/age");
    });

    it("should insert a Control at a specific index within a layout", () => {
      const ui = baseUi();
      const next = insertNode(ui, [], 0, {
        type: "Control",
        scope: "#/properties/age",
      } as UISchemaElement);
      const elements = (next as unknown as { elements: UISchemaElement[] }).elements;
      expect((elements[0] as { scope: string }).scope).to.equal("#/properties/age");
      expect((elements[1] as { scope: string }).scope).to.equal("#/properties/name");
    });

    it("should return a new uiSchema object without mutating the input", () => {
      const ui = baseUi();
      const before = JSON.stringify(ui);
      insertNode(ui, [], 0, { type: "Control", scope: "#/properties/x" } as UISchemaElement);
      expect(JSON.stringify(ui)).to.equal(before);
    });
  });

  describe("removeNode", () => {
    it("should remove a Control at a given path", () => {
      const ui = baseUi();
      const next = removeNode(ui, [0]);
      expect(((next as unknown as { elements: unknown[] }).elements)).to.have.length(0);
    });

    it("should remove a layout subtree including its descendants", () => {
      const ui = insertNode(baseUi(), [], 1, buildLayoutNode("Group"));
      const next = removeNode(ui, [1]);
      expect(((next as unknown as { elements: unknown[] }).elements)).to.have.length(1);
    });

    it("should remove the bound property when the last referencing Control is deleted", () => {
      const { schema, uiSchema } = removeNodeWithSchema(baseSchema(), baseUi(), [0]);
      expect(schema.properties).to.not.have.property("name");
      expect((uiSchema as unknown as { elements: unknown[] }).elements).to.have.length(0);
    });

    it("should keep the property when another Control still references the same scope", () => {
      const ui = insertNode(baseUi(), [], 1, {
        type: "Control",
        scope: "#/properties/name",
      } as UISchemaElement);
      const { schema } = removeNodeWithSchema(baseSchema(), ui, [0]);
      expect(schema.properties).to.have.property("name");
    });

    it("should recursively remove properties from nested Controls when a Group is deleted", () => {
      const schema: SchemaDoc = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
          keep: { type: "string" },
        },
      };
      const ui = {
        type: "VerticalLayout",
        elements: [
          { type: "Control", scope: "#/properties/keep" },
          {
            type: "Group",
            elements: [
              { type: "Control", scope: "#/properties/name" },
              { type: "Control", scope: "#/properties/age" },
            ],
          },
        ],
      } as unknown as UiSchemaDoc;
      const result = removeNodeWithSchema(schema, ui, [1]);
      expect(result.schema.properties).to.have.property("keep");
      expect(result.schema.properties).to.not.have.property("name");
      expect(result.schema.properties).to.not.have.property("age");
    });

    it("should remove the entry from the `required` array when present", () => {
      const { schema } = removeNodeWithSchema(baseSchema(), baseUi(), [0]);
      expect(schema.required ?? []).to.not.include("name");
    });
  });

  describe("moveNode", () => {
    it("should reorder siblings within the same layout", () => {
      let ui = baseUi();
      ui = insertNode(ui, [], 1, { type: "Control", scope: "#/properties/age" } as UISchemaElement);
      const next = moveNode(ui, [0], [], 2);
      const elements = (next as unknown as { elements: UISchemaElement[] }).elements;
      expect((elements[0] as { scope: string }).scope).to.equal("#/properties/age");
      expect((elements[1] as { scope: string }).scope).to.equal("#/properties/name");
    });

    it("should move a node from one layout to another", () => {
      let ui = baseUi();
      ui = insertNode(ui, [], 1, buildLayoutNode("Group"));
      const next = moveNode(ui, [0], [1], 0);
      const root = (next as unknown as { elements: UISchemaElement[] }).elements;
      expect(root).to.have.length(1); // name moved out
      const group = root[0] as unknown as { elements: UISchemaElement[] };
      expect(group.elements).to.have.length(1);
      expect((group.elements[0] as { scope: string }).scope).to.equal("#/properties/name");
    });
  });

  describe("addNewField", () => {
    it("should add a string property to the schema AND a Control to the uiSchema atomically", () => {
      const result = addNewField(baseSchema(), baseUi(), [], 1, "string");
      expect(result.schema.properties).to.have.property(result.propertyKey);
      const elements = (result.uiSchema as unknown as { elements: UISchemaElement[] }).elements;
      expect(elements).to.have.length(2);
      expect((elements[1] as { scope: string }).scope).to.equal(`#/properties/${result.propertyKey}`);
    });

    it("should generate a unique property key when the default collides", () => {
      let r = addNewField(baseSchema(), baseUi(), [], 1, "string");
      expect(r.propertyKey).to.equal("field");
      r = addNewField(r.schema, r.uiSchema, [], 2, "string");
      expect(r.propertyKey).to.equal("field_1");
      r = addNewField(r.schema, r.uiSchema, [], 3, "string");
      expect(r.propertyKey).to.equal("field_2");
    });

    it("should set renderer-specific options for richtext/json/multiline/date fields", () => {
      const rt = addNewField(baseSchema(), baseUi(), [], 1, "richtext");
      const rtControl = ((rt.uiSchema as unknown as { elements: UISchemaElement[] }).elements[1]) as { options?: { format?: string } };
      expect(rtControl.options?.format).to.equal("richtext");

      const json = addNewField(baseSchema(), baseUi(), [], 1, "json");
      const jsonControl = ((json.uiSchema as unknown as { elements: UISchemaElement[] }).elements[1]) as { options?: { format?: string } };
      expect(jsonControl.options?.format).to.equal("json");

      const multi = addNewField(baseSchema(), baseUi(), [], 1, "multiline");
      const multiControl = ((multi.uiSchema as unknown as { elements: UISchemaElement[] }).elements[1]) as { options?: { multi?: boolean } };
      expect(multiControl.options?.multi).to.equal(true);

      const date = addNewField(baseSchema(), baseUi(), [], 1, "date");
      const dateProp = date.schema.properties?.[date.propertyKey] as { format?: string };
      expect(dateProp.format).to.equal("date");
    });
  });

  describe("renameProperty", () => {
    it("should rename a property in the schema", () => {
      const result = renameProperty(baseSchema(), baseUi(), "name", "fullName");
      expect(result.schema.properties).to.have.property("fullName");
      expect(result.schema.properties).to.not.have.property("name");
    });

    it("should rewrite every uiSchema scope that referenced the old key", () => {
      const result = renameProperty(baseSchema(), baseUi(), "name", "fullName");
      const control = (result.uiSchema as unknown as { elements: UISchemaElement[] }).elements[0];
      expect((control as { scope: string }).scope).to.equal("#/properties/fullName");
    });

    it("should update schema.required if the renamed property was required", () => {
      const result = renameProperty(baseSchema(), baseUi(), "name", "fullName");
      expect(result.schema.required).to.deep.equal(["fullName"]);
    });
  });
});
