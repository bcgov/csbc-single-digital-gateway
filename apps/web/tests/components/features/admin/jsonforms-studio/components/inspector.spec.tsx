import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useStudioStore } from "../../../../../../src/features/admin/jsonforms-studio/state/studio-store";

jest.mock("@repo/ui", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: { children?: ReactNode; onClick?: () => void } & Record<string, unknown>) => (
    <button onClick={onClick} data-cy={props["data-cy"] as string}>
      {children}
    </button>
  ),
  Empty: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  EmptyTitle: ({ children }: { children?: ReactNode }) => (
    <p>{children}</p>
  ),
  EmptyDescription: ({ children }: { children?: ReactNode }) => (
    <p>{children}</p>
  ),
}));

jest.mock(
  "../../../../../../src/features/admin/jsonforms-studio/components/inspector-form.component",
  () => ({
    InspectorForm: () => <div data-testid="inspector-form">InspectorForm</div>,
  }),
);

jest.mock(
  "../../../../../../src/features/admin/jsonforms-studio/components/inspector-json.component",
  () => ({
    InspectorJson: () => <div data-testid="inspector-json">InspectorJson</div>,
  }),
);

import { Inspector } from "../../../../../../src/features/admin/jsonforms-studio/components/inspector.component";

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

  afterEach(cleanup);

  it("should render an empty-state when no node is selected", () => {
    useStudioStore.getState().initialize(payload());
    render(<Inspector />);
    expect(screen.getByText("No selection")).toBeInTheDocument();
  });

  it("should default to the Form view tab", () => {
    useStudioStore.getState().initialize(payload());
    useStudioStore.getState().select([0]);
    const { container } = render(<Inspector />);
    expect(container.querySelector('[data-cy="inspector-view-form"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cy="inspector-view-json"]')).toBeInTheDocument();
    expect(screen.getByTestId("inspector-form")).toBeInTheDocument();
  });

  it("should switch to the JSON view when toggled", () => {
    useStudioStore.getState().initialize(payload());
    useStudioStore.getState().select([0]);
    const { container } = render(<Inspector />);
    fireEvent.click(container.querySelector('[data-cy="inspector-view-json"]')!);
    expect(screen.getByTestId("inspector-json")).toBeInTheDocument();
  });

  it("should toggle back to the Form view without losing selection", () => {
    useStudioStore.getState().initialize(payload());
    useStudioStore.getState().select([0]);
    const { container } = render(<Inspector />);
    fireEvent.click(container.querySelector('[data-cy="inspector-view-json"]')!);
    fireEvent.click(container.querySelector('[data-cy="inspector-view-form"]')!);
    expect(screen.getByTestId("inspector-form")).toBeInTheDocument();
    expect(useStudioStore.getState().selection).toEqual([0]);
  });
});
