import { useStudioStore } from "./studio-store";

const samplePayload = (overrides: Partial<{ readonly: boolean }> = {}) => ({
  schema: { type: "object", properties: { name: { type: "string" } } },
  uiSchema: {
    type: "VerticalLayout",
    elements: [{ type: "Control", scope: "#/properties/name" }],
  },
  readonly: overrides.readonly ?? false,
});

describe("jsonforms-studio / studio-store", () => {
  beforeEach(() => {
    useStudioStore.getState().reset();
  });

  describe("initialize", () => {
    it("should hydrate schema, uiSchema, readonly from a handoff payload", () => {
      useStudioStore.getState().initialize(samplePayload());
      const state = useStudioStore.getState();
      expect(state.hydrated).to.equal(true);
      expect(state.readonly).to.equal(false);
      expect(state.schema.properties).to.have.property("name");
    });

    it("should start with an empty selection and empty history", () => {
      useStudioStore.getState().initialize(samplePayload());
      const state = useStudioStore.getState();
      expect(state.selection).to.equal(null);
      expect(state.history.past).to.have.length(0);
    });
  });

  describe("applyPaletteItem", () => {
    it("should add a new-field palette item by updating both schema and uiSchema and pushing history", () => {
      useStudioStore.getState().initialize(samplePayload());
      useStudioStore.getState().applyPaletteItem(
        { kind: "new-field", fieldType: "string" },
        [],
        1,
      );
      const state = useStudioStore.getState();
      expect(Object.keys(state.schema.properties ?? {}).length).to.equal(2);
      const elements = (state.uiSchema as unknown as { elements: unknown[] }).elements;
      expect(elements).to.have.length(2);
      expect(state.history.past).to.have.length(1);
    });

    it("should add a layout palette item as a new container at the drop path", () => {
      useStudioStore.getState().initialize(samplePayload());
      useStudioStore.getState().applyPaletteItem(
        { kind: "layout", layoutType: "Group" },
        [],
        1,
      );
      const state = useStudioStore.getState();
      const elements = (state.uiSchema as unknown as { elements: { type: string }[] }).elements;
      expect(elements[1].type).to.equal("Group");
    });

    it("should be a no-op when the store is readonly", () => {
      useStudioStore.getState().initialize(samplePayload({ readonly: true }));
      const before = useStudioStore.getState().uiSchema;
      useStudioStore.getState().applyPaletteItem(
        { kind: "layout", layoutType: "Group" },
        [],
        1,
      );
      expect(useStudioStore.getState().uiSchema).to.equal(before);
    });
  });

  describe("deleteAt", () => {
    it("should remove the selected node and clear selection", () => {
      useStudioStore.getState().initialize(samplePayload());
      useStudioStore.getState().select([0]);
      useStudioStore.getState().deleteAt([0]);
      const state = useStudioStore.getState();
      expect((state.uiSchema as unknown as { elements: unknown[] }).elements).to.have.length(0);
      expect(state.selection).to.equal(null);
    });

    it("should remove the bound schema property on deleteAt", () => {
      useStudioStore.getState().initialize(samplePayload());
      useStudioStore.getState().deleteAt([0]);
      expect(useStudioStore.getState().schema.properties).to.not.have.property("name");
    });

    it("should restore the deleted schema property on undo", () => {
      useStudioStore.getState().initialize(samplePayload());
      useStudioStore.getState().deleteAt([0]);
      expect(useStudioStore.getState().schema.properties).to.not.have.property("name");
      useStudioStore.getState().undo();
      expect(useStudioStore.getState().schema.properties).to.have.property("name");
    });
  });

  describe("undo / redo", () => {
    it("should undo the last mutation", () => {
      useStudioStore.getState().initialize(samplePayload());
      useStudioStore.getState().applyPaletteItem(
        { kind: "new-field", fieldType: "string" },
        [],
        1,
      );
      expect(((useStudioStore.getState().uiSchema as unknown as { elements: unknown[] }).elements)).to.have.length(2);
      useStudioStore.getState().undo();
      expect(((useStudioStore.getState().uiSchema as unknown as { elements: unknown[] }).elements)).to.have.length(1);
    });

    it("should redo after an undo", () => {
      useStudioStore.getState().initialize(samplePayload());
      useStudioStore.getState().applyPaletteItem(
        { kind: "new-field", fieldType: "string" },
        [],
        1,
      );
      useStudioStore.getState().undo();
      useStudioStore.getState().redo();
      expect(((useStudioStore.getState().uiSchema as unknown as { elements: unknown[] }).elements)).to.have.length(2);
    });

    it("should not push selection changes onto history", () => {
      useStudioStore.getState().initialize(samplePayload());
      useStudioStore.getState().select([0]);
      expect(useStudioStore.getState().history.past).to.have.length(0);
    });
  });

  describe("canApply", () => {
    it("should be true when every Control scope resolves", () => {
      useStudioStore.getState().initialize(samplePayload());
      expect(useStudioStore.getState().canApply()).to.equal(true);
    });

    it("should be false while any Control has a dangling scope", () => {
      useStudioStore.getState().initialize({
        schema: { type: "object", properties: {} },
        uiSchema: { type: "VerticalLayout", elements: [{ type: "Control", scope: "#/properties/missing" }] },
        readonly: false,
      });
      expect(useStudioStore.getState().canApply()).to.equal(false);
    });

    it("should be false when readonly", () => {
      useStudioStore.getState().initialize(samplePayload({ readonly: true }));
      expect(useStudioStore.getState().canApply()).to.equal(false);
    });
  });

  describe("renamePropertyKey", () => {
    it("should rename and rewrite all referencing scopes", () => {
      useStudioStore.getState().initialize(samplePayload());
      useStudioStore.getState().renamePropertyKey("name", "fullName");
      const state = useStudioStore.getState();
      expect(state.schema.properties).to.have.property("fullName");
      const control = (state.uiSchema as unknown as { elements: { scope: string }[] }).elements[0];
      expect(control.scope).to.equal("#/properties/fullName");
    });
  });
});
