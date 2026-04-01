import { AuthProviderWrapper } from "tests/utils/auth-provider-wrapper";
import { RouterProviderWrapper } from "tests/utils/router-provider-wrapper";
import { SignIn } from "../sign-in.component";

const mountSignIn = (isAuthenticated: boolean) => {
  const login = cy.stub().as("login");
  const logout = cy.stub().as("logout");
  const navigate = cy.stub().as("navigate");

  const component = () => (
    <AuthProviderWrapper
      authState={{
        isAuthenticated,
        isLoading: false,
        user: null,
        login,
        logout,
      }}
      authProvider={{
        idpType: "bcsc",
        defaultRedirectPath: "/app",
        children: <SignIn />,
      }}
    />
  );
  const createRoutes = [
    {
      path: "/",
      component: () => <SignIn />,
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
      navigateSpy={navigate}
    />,
  );
};

const mockMeEndpoint = (statusCode: number) => {
  cy.intercept("GET", "http://localhost:5173/api/auth/bcsc/me", {
    statusCode,
    fixture: "userProfile.json",
  }).as("getUserProfile");
};

const mockBcscLoginEndpoint = () => {
  cy.intercept("GET", "https://idtest.gov.bc.ca/login/entry", {
    statusCode: 302,
    headers: {
      Location: "http://localhost:5173/app",
    },
  }).as("bcscLogin");
};

describe("SignIn Component Test", () => {
  it("Should apply BCGov button styling when authenticated", () => {
    mockMeEndpoint(200);

    mountSignIn(true);

    cy.wait("@getUserProfile").then(() => {
      cy.contains("button", "Go to App").should("have.class", "bg-bcgov-blue");
    });
  });

  it("Should apply BCGov button styling when unauthenticated", () => {
    mountSignIn(false);

    cy.contains("button", "Sign In").should("have.class", "bg-bcgov-blue");
  });

  it("Should render 'Go to App' and navigate when user is authenticated", () => {
    mockMeEndpoint(200);

    mountSignIn(true);

    cy.wait("@getUserProfile").then(() => {
      cy.contains("button", "Go to App").should("exist");
      cy.contains("button", "Sign In").should("not.exist");

      cy.contains("button", "Go to App").click();

      cy.get("@navigate").should("have.been.calledOnceWith", {
        to: "/app",
        from: undefined,
      });
      cy.get("@login").should("not.have.been.called");
    });
  });

  it.skip("Should render 'Sign In' and call login when user is not authenticated", () => {
    // TODO: End to end test
    mountSignIn(false);

    cy.contains("button", "Sign In").should("exist");
    cy.contains("button", "Go to App").should("not.exist");

    mockBcscLoginEndpoint();

    cy.contains("button", "Sign In").click();

    cy.wait("@bcscLogin").then((interception) => {
      expect(interception.request.url).to.equal(
        "https://idtest.gov.bc.ca/login/entry",
      );
      expect(interception.response?.statusCode).to.equal(302);
      expect(interception.response?.headers.Location).to.equal(
        "http://localhost:5173/app",
      );
    });
  });
});
