import { cleanup, render, screen } from "@testing-library/react";

jest.mock(
  "src/features/services/components/your-activity-row.component",
  () => ({
    YourActivityRow: ({
      application,
      serviceId,
    }: {
      application: { id: string; serviceApplicationTitle: string };
      serviceId: string;
    }) => (
      <div
        data-testid={`row-${application.id}`}
        data-service-id={serviceId}
      >
        {application.serviceApplicationTitle}
      </div>
    ),
  }),
);

import { YourActivityList } from "src/features/services/components/your-activity-list.component";
import type { EnrichedApplicationDto } from "src/features/services/application.dto";

const makeItem = (
  id: string,
  title: string,
  createdAt: string,
): EnrichedApplicationDto => ({
  id,
  serviceId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  serviceVersionId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
  serviceVersionTranslationId: "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
  serviceApplicationId: "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
  serviceApplicationType: "workflow",
  userId: "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66",
  delegateUserId: null,
  metadata: {},
  createdAt,
  updatedAt: createdAt,
  serviceTitle: "A service",
  serviceApplicationTitle: title,
});

describe("YourActivityList Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render one YourActivityRow per item in the items array", () => {
    const items = [
      makeItem(
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "Alpha",
        "2026-04-22T12:00:00Z",
      ),
      makeItem(
        "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        "Beta",
        "2026-04-21T12:00:00Z",
      ),
      makeItem(
        "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
        "Gamma",
        "2026-04-20T12:00:00Z",
      ),
    ];

    render(<YourActivityList items={items} serviceId="svc-1" />);

    expect(screen.getAllByTestId(/^row-/)).toHaveLength(3);
    expect(
      screen.getByTestId(`row-a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`),
    ).toHaveAttribute("data-service-id", "svc-1");
  });

  it("Should preserve the API-returned ordering of items without re-sorting on the client", () => {
    // Intentionally NOT sorted by createdAt — caller-provided order must be preserved.
    const items = [
      makeItem(
        "11111111-1111-4111-8111-111111111111",
        "First",
        "2026-04-01T12:00:00Z",
      ),
      makeItem(
        "22222222-2222-4222-8222-222222222222",
        "Third",
        "2026-04-03T12:00:00Z",
      ),
      makeItem(
        "33333333-3333-4333-8333-333333333333",
        "Second",
        "2026-04-02T12:00:00Z",
      ),
    ];

    render(<YourActivityList items={items} serviceId="svc-1" />);

    const rendered = screen.getAllByTestId(/^row-/);
    expect(rendered[0]).toHaveTextContent("First");
    expect(rendered[1]).toHaveTextContent("Third");
    expect(rendered[2]).toHaveTextContent("Second");
  });
});
