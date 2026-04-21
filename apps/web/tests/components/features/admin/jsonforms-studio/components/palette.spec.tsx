import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { useStudioStore } from "../../../../../../src/features/admin/jsonforms-studio/state/studio-store";

jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    isDragging: false,
  }),
}));

import { DndContext } from "@dnd-kit/core";
import { Palette } from "../../../../../../src/features/admin/jsonforms-studio/components/palette.component";

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

function renderPalette() {
  return render(
    <DndContext>
      <Palette />
    </DndContext>,
  );
}

describe("jsonforms-studio / Palette", () => {
  beforeEach(() => {
    useStudioStore.getState().reset();
  });

  afterEach(cleanup);

  it("should render the four palette sections", () => {
    useStudioStore.getState().initialize(samplePayload());
    const { container } = renderPalette();
    expect(container.querySelector('[data-cy="palette-section-layouts"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cy="palette-section-new-field"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cy="palette-section-bound"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cy="palette-section-custom"]')).toBeInTheDocument();
  });

  it("should render layout items including Vertical, Horizontal, Group, Categorization", () => {
    useStudioStore.getState().initialize(samplePayload());
    const { container } = renderPalette();
    expect(container.querySelector('[data-cy="palette-item-layout-VerticalLayout"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cy="palette-item-layout-HorizontalLayout"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cy="palette-item-layout-Group"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cy="palette-item-layout-Categorization"]')).toBeInTheDocument();
  });

  it("should render new-field items for primitive types and renderers", () => {
    useStudioStore.getState().initialize(samplePayload());
    const { container } = renderPalette();
    ["string", "number", "integer", "boolean", "date", "enum", "richtext", "json", "multiline"].forEach(
      (t) => expect(container.querySelector(`[data-cy="palette-item-field-${t}"]`)).toBeInTheDocument(),
    );
  });

  it("should render a bound-control item per schema property", () => {
    useStudioStore.getState().initialize(samplePayload());
    const { container } = renderPalette();
    expect(container.querySelector('[data-cy="palette-item-bound-name"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cy="palette-item-bound-age"]')).toBeInTheDocument();
  });

  it("should render the four custom renderers", () => {
    useStudioStore.getState().initialize(samplePayload());
    const { container } = renderPalette();
    expect(container.querySelector('[data-cy="palette-item-custom-richtext"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cy="palette-item-custom-asyncSelect"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cy="palette-item-custom-json"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cy="palette-item-custom-multiline"]')).toBeInTheDocument();
  });

  it("should mark items as disabled in readonly mode", () => {
    useStudioStore.getState().initialize(samplePayload({ readonly: true }));
    const { container } = renderPalette();
    const item = container.querySelector('[data-cy="palette-item-layout-VerticalLayout"]');
    expect(item).toHaveClass("opacity-50");
  });

  it("should update the bound section when a property is added", () => {
    useStudioStore.getState().initialize(samplePayload());
    const { container } = renderPalette();
    expect(container.querySelector('[data-cy="palette-item-bound-name"]')).toBeInTheDocument();
    act(() => {
      useStudioStore.getState().applyPaletteItem(
        { kind: "new-field", fieldType: "string" },
        [],
        1,
      );
    });
    expect(container.querySelector('[data-cy^="palette-item-bound-field"]')).toBeInTheDocument();
  });
});
