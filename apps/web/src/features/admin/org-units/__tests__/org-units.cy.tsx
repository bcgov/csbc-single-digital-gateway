import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { Member } from "../data/org-unit-members.query";
import type { OrgUnit } from "../data/org-units.query";

import { MemberTable } from "../components/member-table.component";
import { OrgUnitsTable } from "../components/org-units-table.component";
import { ChildrenTable } from "../components/children-table.component";
import { RemoveMemberDialog } from "../components/remove-member-dialog.component";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mountWithRouter(children: React.ReactNode) {
  const rootRoute = createRootRoute({ component: () => children });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: "/admin/settings/org-units/$orgUnitId",
      }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  cy.mount(<RouterProvider router={router} />);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_UNIT_FIXTURES: OrgUnit[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Ministry of Health",
    type: "ministry",
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Digital Services Branch",
    type: "branch",
    createdAt: "2025-03-10T00:00:00Z",
    updatedAt: "2025-05-20T00:00:00Z",
  },
];

const MEMBER_FIXTURES: Member[] = [
  {
    userId: "aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Alice Smith",
    email: "alice@example.com",
    role: "admin",
    createdAt: "2025-02-01T00:00:00Z",
  },
  {
    userId: "bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    name: null,
    email: "bob@example.com",
    role: "member",
    createdAt: "2025-04-15T00:00:00Z",
  },
  {
    userId: "cccc3333-cccc-cccc-cccc-cccccccccccc",
    name: null,
    email: null,
    role: "member",
    createdAt: "2025-05-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// MemberTable
// ---------------------------------------------------------------------------

describe("MemberTable", () => {
  it("renders member rows with name, email, and role", () => {
    const onRemove = cy.stub().as("onRemove");
    cy.mount(<MemberTable members={MEMBER_FIXTURES} onRemove={onRemove} />);

    cy.get("table").should("exist");
    cy.get("tbody tr").should("have.length", 3);

    // First row – has name
    cy.get("tbody tr").eq(0).within(() => {
      cy.get("td").eq(0).should("contain.text", "Alice Smith");
      cy.get("td").eq(1).should("contain.text", "alice@example.com");
      cy.get("td").eq(2).should("contain.text", "admin");
    });

    // Second row – null name shows dash
    cy.get("tbody tr").eq(1).within(() => {
      cy.get("td").eq(0).should("contain.text", "—");
      cy.get("td").eq(1).should("contain.text", "bob@example.com");
      cy.get("td").eq(2).should("contain.text", "member");
    });
  });

  it("shows empty state when no members", () => {
    const onRemove = cy.stub();
    cy.mount(<MemberTable members={[]} onRemove={onRemove} />);

    cy.contains("No members yet").should("be.visible");
    cy.get("table").should("not.exist");
  });

  it("calls onRemove with the correct member when remove button clicked", () => {
    const onRemove = cy.stub().as("onRemove");
    cy.mount(<MemberTable members={MEMBER_FIXTURES} onRemove={onRemove} />);

    cy.get("tbody tr")
      .eq(1)
      .find("button")
      .click()
      .then(() => {
        expect(onRemove).to.have.been.calledOnce;
        expect(onRemove.firstCall.args[0]).to.deep.equal(MEMBER_FIXTURES[1]);
      });
  });
});

// ---------------------------------------------------------------------------
// RemoveMemberDialog
// ---------------------------------------------------------------------------

describe("RemoveMemberDialog", () => {
  const MEMBER: Member = MEMBER_FIXTURES[0];

  it("shows member name in the confirmation dialog", () => {
    const onConfirm = cy.stub();
    const onCancel = cy.stub();
    cy.mount(
      <RemoveMemberDialog
        member={MEMBER}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    cy.contains("Remove Member").should("be.visible");
    cy.contains("Alice Smith").should("be.visible");
  });

  it("falls back to email when name is null", () => {
    const onConfirm = cy.stub();
    const onCancel = cy.stub();
    cy.mount(
      <RemoveMemberDialog
        member={MEMBER_FIXTURES[1]}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    cy.contains("bob@example.com").should("be.visible");
  });

  it("falls back to 'this member' when name and email are null", () => {
    const onConfirm = cy.stub();
    const onCancel = cy.stub();
    cy.mount(
      <RemoveMemberDialog
        member={MEMBER_FIXTURES[2]}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    cy.contains("this member").should("be.visible");
  });

  it("calls onConfirm when the Remove button is clicked", () => {
    const onConfirm = cy.stub().as("onConfirm");
    const onCancel = cy.stub();
    cy.mount(
      <RemoveMemberDialog
        member={MEMBER}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    cy.get("[data-slot='alert-dialog-action']")
      .contains("Remove")
      .click({ force: true })
      .then(() => {
        expect(onConfirm).to.have.been.calledOnce;
      });
  });

  it("calls onCancel when the Cancel button is clicked", () => {
    const onConfirm = cy.stub();
    const onCancel = cy.stub().as("onCancel");
    cy.mount(
      <RemoveMemberDialog
        member={MEMBER}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    cy.get("[data-slot='alert-dialog-cancel']")
      .contains("Cancel")
      .click({ force: true })
      .then(() => {
        expect(onCancel).to.have.been.calledOnce;
      });
  });

  it("disables buttons when isPending is true", () => {
    const onConfirm = cy.stub();
    const onCancel = cy.stub();
    cy.mount(
      <RemoveMemberDialog
        member={MEMBER}
        isPending={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    cy.contains("button", "Cancel").should("be.disabled");
    cy.contains("button", "Removing").should("be.disabled");
  });

  it("does not render when member is null", () => {
    const onConfirm = cy.stub();
    const onCancel = cy.stub();
    cy.mount(
      <RemoveMemberDialog
        member={null}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    cy.contains("Remove Member").should("not.exist");
  });
});

// ---------------------------------------------------------------------------
// OrgUnitsTable (requires router wrapper for <Link>)
// ---------------------------------------------------------------------------

describe("OrgUnitsTable", () => {
  it("renders rows from org units data", () => {
    const onPageChange = cy.stub();
    mountWithRouter(
      <OrgUnitsTable
        orgUnits={ORG_UNIT_FIXTURES}
        currentPage={1}
        totalPages={1}
        onPageChange={onPageChange}
      />,
    );

    cy.get("tbody tr").should("have.length", 2);
    cy.get("tbody tr").eq(0).should("contain.text", "Ministry of Health");
    cy.get("tbody tr").eq(0).should("contain.text", "ministry");
    cy.get("tbody tr").eq(1).should("contain.text", "Digital Services Branch");
    cy.get("tbody tr").eq(1).should("contain.text", "branch");
  });

  it("shows empty state when no org units on page 1", () => {
    const onPageChange = cy.stub();
    mountWithRouter(
      <OrgUnitsTable
        orgUnits={[]}
        currentPage={1}
        totalPages={0}
        onPageChange={onPageChange}
      />,
    );

    cy.contains("No org units found").should("be.visible");
    cy.get("table").should("not.exist");
  });

  it("renders links to the detail page for each org unit", () => {
    const onPageChange = cy.stub();
    mountWithRouter(
      <OrgUnitsTable
        orgUnits={ORG_UNIT_FIXTURES}
        currentPage={1}
        totalPages={1}
        onPageChange={onPageChange}
      />,
    );

    cy.get("tbody tr")
      .eq(0)
      .find("a")
      .should("have.attr", "href")
      .and("include", ORG_UNIT_FIXTURES[0].id);
  });

  it("does not render pagination when totalPages is 1", () => {
    const onPageChange = cy.stub();
    mountWithRouter(
      <OrgUnitsTable
        orgUnits={ORG_UNIT_FIXTURES}
        currentPage={1}
        totalPages={1}
        onPageChange={onPageChange}
      />,
    );

    cy.get("nav").should("not.exist");
  });

  it("renders pagination and calls onPageChange", () => {
    const onPageChange = cy.stub().as("onPageChange");
    mountWithRouter(
      <OrgUnitsTable
        orgUnits={ORG_UNIT_FIXTURES}
        currentPage={1}
        totalPages={3}
        onPageChange={onPageChange}
      />,
    );

    // Pagination should exist
    cy.get("nav").should("exist");

    // Click page 2
    cy.get("nav")
      .contains("2")
      .click()
      .then(() => {
        expect(onPageChange).to.have.been.calledWith(2);
      });
  });

  it("disables previous button on first page", () => {
    const onPageChange = cy.stub();
    mountWithRouter(
      <OrgUnitsTable
        orgUnits={ORG_UNIT_FIXTURES}
        currentPage={1}
        totalPages={3}
        onPageChange={onPageChange}
      />,
    );

    cy.get("nav")
      .find("a[aria-disabled='true']")
      .first()
      .should("have.class", "pointer-events-none");
  });
});

// ---------------------------------------------------------------------------
// ChildrenTable (requires router wrapper for <Link>)
// ---------------------------------------------------------------------------

describe("ChildrenTable", () => {
  it("renders child org unit rows", () => {
    mountWithRouter(<ChildrenTable orgUnits={ORG_UNIT_FIXTURES} />);

    cy.get("tbody tr").should("have.length", 2);
    cy.get("tbody tr").eq(0).should("contain.text", "Ministry of Health");
    cy.get("tbody tr").eq(1).should("contain.text", "Digital Services Branch");
  });

  it("shows empty state when no children", () => {
    mountWithRouter(<ChildrenTable orgUnits={[]} />);

    cy.contains("No child org units yet").should("be.visible");
    cy.get("table").should("not.exist");
  });

  it("renders links to detail pages", () => {
    mountWithRouter(<ChildrenTable orgUnits={ORG_UNIT_FIXTURES} />);

    cy.get("tbody tr")
      .eq(0)
      .find("a")
      .should("have.attr", "href")
      .and("include", ORG_UNIT_FIXTURES[0].id);
  });

  it("displays type as a badge", () => {
    mountWithRouter(<ChildrenTable orgUnits={ORG_UNIT_FIXTURES} />);

    cy.get("tbody tr").eq(0).contains("ministry").should("be.visible");
    cy.get("tbody tr").eq(1).contains("branch").should("be.visible");
  });
});
