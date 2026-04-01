import { AuthProviderWrapper } from "tests/utils/auth-provider-wrapper";
import { RouterProviderWrapper } from "tests/utils/router-provider-wrapper";
import type { UserProfile } from "../../auth.types";
import { SignOut } from "../sign-out.component";

const mountSignOut = () => {
  const login = cy.stub().as("login");
  const logout = cy.stub().as("logout");

  return cy.fixture<UserProfile>("userProfile.json").then((fixtureUser) => {
    const user = fixtureUser;
    const component = () => (
      <AuthProviderWrapper
        authState={{
          isAuthenticated: true,
          isLoading: false,
          user: user,
          login,
          logout,
        }}
        authProvider={{
          idpType: "bcsc",
          defaultRedirectPath: "/app",
          children: <SignOut />,
        }}
      />
    );
    const createRoutes = [
      {
        path: "/",
        component: () => <SignOut />,
      },
      {
        path: "/app",
        component: () => <div data-cy="app-route" />,
      },
    ];
    cy.mount(
      <RouterProviderWrapper
        component={component}
        createRoutes={createRoutes}
        initialEntries={["/app"]}
      />,
    );
  });
};

const mockLogoutEndpoint = () => {
  cy.intercept("POST", "http://localhost:5173/api/auth/bcsc/logout", {
    statusCode: 200,
    body: { logoutUrl: null },
  }).as("mockLogout");
};

describe("SignOut Component Test", () => {
  it("Should render the Sign Out button", () => {
    mountSignOut();

    cy.contains("button", "Sign Out").should("exist");
  });

  it("Should apply danger button styling", () => {
    mountSignOut();

    cy.contains("button", "Sign Out").should("have.class", "bg-danger");
  });

  it.skip("Should call logout when clicked", () => {
    // TODO: This test is currently skipped because the logout function
    // requires session and CSRF data stored on the client page. We need
    // to sign in a user to acquire data for the logout function to work
    // properly. We can implement this in the future by signing in a user
    // with correct credentials.
    mountSignOut();

    mockLogoutEndpoint();

    cy.contains("button", "Sign Out").click();

    cy.wait("@mockLogout").then((interception) => {
      cy.log("interception; ", interception);
    });
  });
});
