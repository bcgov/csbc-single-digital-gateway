import { customRequest } from "../../support/requests";

describe("BCSC Authentication E2E Test", () => {
  const loginEndpoint = "/api/auth/bcsc/login";
  const logoutEndpoint = "/api/auth/bcsc/logout";
  const callbackEndpoint = "/api/auth/bcsc/callback";
  const meEndpoint = "/api/auth/bcsc/me";

  describe("@Get('login')", () => {
    it("Should return redirect URI to the IDTEST login page when calling the endpoint", () => {
      customRequest(false, (WEB_APP_URL: any) => {
        cy.request({
          url: `${WEB_APP_URL}${loginEndpoint}`,
          method: "GET",
          followRedirect: false,
        }).then((response) => {
          expect(response.status).to.equal(302);
          expect(response.redirectedToUrl).to.include(
            encodeURIComponent("/auth/bcsc/callback"),
          );
        });
      });
    });

    it("Should display the correct user information when cookies are saved and available", () => {
      customRequest(true, (WEB_APP_URL: any) => {
        cy.visit(`${WEB_APP_URL}/app`);
        cy.url({ timeout: 20000 });
        cy.contains("Hello").should("be.visible");
      });
    });
  });

  describe("@Get('callback')", () => {
    it("Should return 200 OK when calling the endpoint without valid cookies", () => {
      customRequest(false, (WEB_APP_URL: any) => {
        cy.request({
          url: `${WEB_APP_URL}${callbackEndpoint}?code=auth_code`,
          method: "GET",
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.equal(200);
        });
      });
    });

    it("Should return 200 OK when calling the endpoint with valid cookies", () => {
      customRequest(true, (WEB_APP_URL: any) => {
        cy.request({
          url: `${WEB_APP_URL}${callbackEndpoint}`,
          method: "GET",
        }).then((response) => {
          expect(response.status).to.equal(200);
        });
      });
    });
  });

  describe("@Get('me')", () => {
    it("Should return 401 Unauthorized when calling the endpoint without valid cookies", () => {
      customRequest(false, (WEB_APP_URL: any) => {
        cy.request({
          url: `${WEB_APP_URL}${meEndpoint}`,
          method: "GET",
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.body.message).to.equal("Unauthorized");
          expect(response.status).to.equal(401);
        });
      });
    });

    it("Should return 200 OK when calling the endpoint with valid cookies", () => {
      customRequest(true, (WEB_APP_URL: any) => {
        cy.request({
          url: `${WEB_APP_URL}${meEndpoint}`,
          method: "GET",
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.equal(200);
        });
      });
    });
  });

  describe("@Post('logout')", () => {
    it("Should return 403 Forbidden when calling the endpoint without valid cookies", () => {
      customRequest(false, (WEB_APP_URL: any) => {
        cy.request({
          url: `${WEB_APP_URL}${logoutEndpoint}`,
          method: "POST",
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.body.message).to.equal("invalid csrf token");
          expect(response.status).to.equal(403);
        });
      });
    });

    it("Should return 403 Forbidden when calling the endpoint with valid cookies on forbidden origin", () => {
      customRequest(true, (WEB_APP_URL: any) => {
        cy.request({
          url: `${WEB_APP_URL}${logoutEndpoint}`,
          method: "POST",
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.body.message).to.equal("invalid csrf token");
          expect(response.status).to.equal(403);
        });
      });
    });

    it("Should sign out successfully when clicking on the button with valid cookies on the app page", () => {
      customRequest(true, (WEB_APP_URL: any) => {
        cy.visit(`${WEB_APP_URL}/app`);
        cy.get(
          'button[data-slot="dropdown-menu-trigger"] [data-slot="avatar-fallback"]',
        ).click({ force: true });
        cy.contains("Sign out").click();
        cy.url({ timeout: 10000 });
        cy.contains("Sign In").should("be.visible");
      });
    });
  });
});
