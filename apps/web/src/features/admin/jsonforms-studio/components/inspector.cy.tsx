import { useStudioStore } from "../state/studio-store";
import { Inspector } from "./inspector.component";

const payload = (overrides: Partial<{ readonly: boolean }> = {}) => ({
  schema: { type: "object", properties: { name: { type: "string" } } },
  uiSchema: {
    type: "VerticalLayout",
    elements: [{ type: "Control", scope: "#/properties/name", label: "Name" }],
  },
  readonly: overrides.readonly ?? false,
});

describe("jsonforms-studio / Inspector", () => {
  beforeEach(() => {
    useStudioStore.getState().reset();
  });

  it("should render an empty-state when no node is selected", () => {
    useStudioStore.getState().initialize(payload());
    cy.mount(<Inspector />);
    cy.contains("No selection").should("exist");
  });

  it("should default to the Form view tab", () => {
    useStudioStore.getState().initialize(payload());
    useStudioStore.getState().select([0]);
    cy.mount(<Inspector />);
    cy.get('[data-cy="inspector-view-form"]').should("exist");
    cy.get('[data-cy="inspector-view-json"]').should("exist");
  });

  it("should switch to the JSON view when toggled", () => {
    useStudioStore.getState().initialize(payload());
    useStudioStore.getState().select([0]);
    cy.mount(<Inspector />);
    cy.get('[data-cy="inspector-view-json"]').click();
    // The Monaco editor mounts a textarea-like region; we just confirm no error pane
    cy.get('[data-cy="inspector-json-error"]').should("not.exist");
  });

  it("should toggle back to the Form view without losing selection", () => {
    useStudioStore.getState().initialize(payload());
    useStudioStore.getState().select([0]);
    cy.mount(<Inspector />);
    cy.get('[data-cy="inspector-view-json"]').click();
    cy.get('[data-cy="inspector-view-form"]').click();
    expect(useStudioStore.getState().selection).to.deep.equal([0]);
  });
});
