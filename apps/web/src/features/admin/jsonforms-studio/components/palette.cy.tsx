import { DndContext } from "@dnd-kit/core";
import { useStudioStore } from "../state/studio-store";
import { Palette } from "./palette.component";

const samplePayload = (overrides: Partial<{ readonly: boolean }> = {}) => ({
  schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
    },
  },
  uiSchema: { type: "VerticalLayout", elements: [] },
  readonly: overrides.readonly ?? false,
});

function mountPalette() {
  cy.mount(
    <DndContext>
      <Palette />
    </DndContext>,
  );
}

describe("jsonforms-studio / Palette", () => {
  beforeEach(() => {
    useStudioStore.getState().reset();
  });

  it("should render the four palette sections", () => {
    useStudioStore.getState().initialize(samplePayload());
    mountPalette();
    cy.get('[data-cy="palette-section-layouts"]').should("exist");
    cy.get('[data-cy="palette-section-new-field"]').should("exist");
    cy.get('[data-cy="palette-section-bound"]').should("exist");
    cy.get('[data-cy="palette-section-custom"]').should("exist");
  });

  it("should render layout items including Vertical, Horizontal, Group, Categorization", () => {
    useStudioStore.getState().initialize(samplePayload());
    mountPalette();
    cy.get('[data-cy="palette-item-layout-VerticalLayout"]').should("exist");
    cy.get('[data-cy="palette-item-layout-HorizontalLayout"]').should("exist");
    cy.get('[data-cy="palette-item-layout-Group"]').should("exist");
    cy.get('[data-cy="palette-item-layout-Categorization"]').should("exist");
  });

  it("should render new-field items for primitive types and renderers", () => {
    useStudioStore.getState().initialize(samplePayload());
    mountPalette();
    ["string", "number", "integer", "boolean", "date", "enum", "richtext", "json", "multiline"].forEach(
      (t) => cy.get(`[data-cy="palette-item-field-${t}"]`).should("exist"),
    );
  });

  it("should render a bound-control item per schema property", () => {
    useStudioStore.getState().initialize(samplePayload());
    mountPalette();
    cy.get('[data-cy="palette-item-bound-name"]').should("exist");
    cy.get('[data-cy="palette-item-bound-age"]').should("exist");
  });

  it("should render the four custom renderers", () => {
    useStudioStore.getState().initialize(samplePayload());
    mountPalette();
    cy.get('[data-cy="palette-item-custom-richtext"]').should("exist");
    cy.get('[data-cy="palette-item-custom-asyncSelect"]').should("exist");
    cy.get('[data-cy="palette-item-custom-json"]').should("exist");
    cy.get('[data-cy="palette-item-custom-multiline"]').should("exist");
  });

  it("should mark items as disabled in readonly mode", () => {
    useStudioStore.getState().initialize(samplePayload({ readonly: true }));
    mountPalette();
    cy.get('[data-cy="palette-item-layout-VerticalLayout"]')
      .should("have.class", "opacity-50");
  });

  it("should update the bound section when a property is added", () => {
    useStudioStore.getState().initialize(samplePayload());
    mountPalette();
    cy.get('[data-cy="palette-item-bound-name"]').should("exist");
    cy.then(() => {
      useStudioStore.getState().applyPaletteItem(
        { kind: "new-field", fieldType: "string" },
        [],
        1,
      );
    });
    // After re-render, a new bound entry should appear
    cy.get('[data-cy^="palette-item-bound-field"]').should("exist");
  });
});
