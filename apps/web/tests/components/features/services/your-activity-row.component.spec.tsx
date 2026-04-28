import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

jest.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string;
    params: Record<string, string>;
    children?: ReactNode;
    className?: string;
  }) => (
    <a
      href={to}
      data-params={JSON.stringify(params)}
      className={className}
    >
      {children}
    </a>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconChevronRight: ({
    className,
    size,
    stroke,
  }: {
    className?: string;
    size?: number;
    stroke?: number;
  }) => (
    <svg
      data-testid="icon-chevron-right"
      data-size={size}
      data-stroke={stroke}
      className={className}
    />
  ),
}));

import { YourActivityRow } from "src/features/services/components/your-activity-row.component";
import type { EnrichedApplicationDto } from "src/features/services/application.dto";

const baseApplication: EnrichedApplicationDto = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  serviceId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  serviceVersionId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
  serviceVersionTranslationId: "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
  serviceApplicationId: "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
  serviceApplicationType: "workflow",
  userId: "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66",
  delegateUserId: null,
  metadata: {},
  createdAt: "2026-04-22T12:00:00.000Z",
  updatedAt: "2026-04-22T12:00:00.000Z",
  serviceTitle: "Small Business Grant",
  serviceApplicationTitle: "Grant application",
};

describe("YourActivityRow Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render serviceApplicationTitle as the primary text", () => {
    render(
      <YourActivityRow application={baseApplication} serviceId="svc-1" />,
    );

    const title = screen.getByText("Grant application");
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("text-sm", "font-semibold", "truncate");
  });

  it("Should render the formatted createdAt date and time as the secondary text", () => {
    render(
      <YourActivityRow application={baseApplication} serviceId="svc-1" />,
    );

    const expected = new Intl.DateTimeFormat("en-CA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(baseApplication.createdAt));
    const date = screen.getByText(expected);
    expect(date).toBeInTheDocument();
    expect(date).toHaveClass("text-sm", "text-muted-foreground", "truncate");
  });

  it("Should render the literal 'Application' as primary text when serviceApplicationTitle is an empty string", () => {
    render(
      <YourActivityRow
        application={{ ...baseApplication, serviceApplicationTitle: "" }}
        serviceId="svc-1"
      />,
    );

    expect(screen.getByText("Application")).toBeInTheDocument();
    expect(screen.queryByText("Grant application")).not.toBeInTheDocument();
  });

  it("Should wrap content in a Link pointing to /app/services/$serviceId/applications/$applicationId with the correct params", () => {
    render(
      <YourActivityRow application={baseApplication} serviceId="svc-1" />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "/app/services/$serviceId/applications/$applicationId",
    );
    expect(link).toHaveAttribute(
      "data-params",
      JSON.stringify({ serviceId: "svc-1", applicationId: baseApplication.id }),
    );
  });
});
