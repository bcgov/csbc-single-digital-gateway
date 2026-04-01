import { Outlet } from "@tanstack/react-router";
import { RouterProviderWrapper } from "tests/utils/router-provider-wrapper";
import { AppSearch } from "../../app-search";
import { AppSearchProvider } from "../../app-search/app-search.context";
import type { NavItem } from "../../navigation-bar";

const navigationItems: NavItem[] = [
  {
    type: "link",
    label: "Admin Page",
    to: "/admin",
    icon: <span data-cy="icon-admin" />,
  },
  {
    type: "menu",
    label: "Settings",
    icon: <span data-cy="icon-settings" />,
    children: [
      { label: "Consent History", to: "/app/settings/consent-history" },
      {
        label: "Consent History Statement",
        to: "/app/settings/consent-history/$statementId",
      },
    ],
  },
];

const mountAppSearch = () => {
  const navigate = cy.stub().as("navigate");

  const component = () => (
    <AppSearchProvider>
      <AppSearch navigationItems={navigationItems} />
      <Outlet />
    </AppSearchProvider>
  );
  const createRoutes = [
    {
      path: "/",
      component: () => <div data-cy="page-home">Home</div>,
    },
    {
      path: "/admin",
      component: () => <div data-cy="page-admin">Admin Page</div>,
    },
    {
      path: "/app/settings/consent-history",
      component: () => (
        <div data-cy="page-consent-history">Consent History Page</div>
      ),
    },
    {
      path: "/app/settings/consent-history/$statementId",
      component: () => (
        <div data-cy="page-consent-history-user">Consent History User Page</div>
      ),
    },
  ];
  cy.mount(
    <RouterProviderWrapper
      component={component}
      createRoutes={createRoutes}
      initialEntries={["/"]}
      navigateSpy={navigate}
    />,
  );
};

const openSearchWithKeyboard = () => {
  cy.document().trigger("keydown", { key: "k", ctrlKey: true });
};

describe("AppSearch Component Test", () => {
  it("Should verify that the component is closed by default", () => {
    mountAppSearch();

    cy.get('[data-cy="page-home"]').should("exist");
    cy.get('[data-cy="page-home"]').should("have.text", "Home");
    cy.get('input[placeholder="Search..."]').should("not.exist");
    cy.contains("Admin Page").should("not.exist");
    cy.contains("Settings").should("not.exist");
  });

  it("Should open with Ctrl+K and show navigation items", () => {
    mountAppSearch();

    openSearchWithKeyboard();

    cy.contains("Navigation").should("exist");
    cy.contains("Admin Page").should("exist");
    cy.contains("Settings").should("exist");
    cy.contains("Consent History").should("exist");
    cy.contains("Consent History Statement").should("exist");
  });

  it("Should navigate to direct link route when selecting a link item", () => {
    // mountAppSearch();

    openSearchWithKeyboard();
    cy.contains("Admin Page").click({ force: true });

    cy.get('[data-cy="page-admin"]').should("exist");
  });

  it("Should navigate to grouped child route and render shortcut label", () => {
    // mountAppSearch();

    openSearchWithKeyboard();
    cy.contains("Settings").should("exist");
    cy.contains("Consent History").click({ force: true });

    cy.get('[data-cy="page-consent-history"]').should("exist");
  });
});
