import { customRequest } from "../../support/requests";
import { IdpType } from "../../utils/idp";

describe("IDIR Authentication E2E Test", () => {
  const loginEndpoint = "/api/auth/idir/login";
  const logoutEndpoint = "/api/auth/idir/logout";
  const callbackEndpoint = "/api/auth/idir/callback";
  const meEndpoint = "/api/auth/idir/me";

  describe("@Get('login')", () => {
    it("Should load the IDIR login page when calling the endpoint", () => {
      customRequest(false, IdpType.IDIR, (WEB_APP_URL: any) => {
        cy.request({
          url: `${WEB_APP_URL}${loginEndpoint}`,
          method: "GET",
          followRedirect: false,
        }).then((response) => {
          expect(response.status).to.equal(200);
        });
      });
    });

    it("Should display the correct user information when cookies are saved and available", () => {
      customRequest(true, IdpType.IDIR, (WEB_APP_URL: any) => {
        cy.visit(`${WEB_APP_URL}/admin`);
        cy.url({ timeout: 20000 });
        cy.contains("Dashboard").should("be.visible");
        cy.contains("Consent").should("be.visible");
        cy.contains("Services").should("be.visible");
      });
    });
  });

  describe("@Get('callback')", () => {
    it("Should return 200 OK when calling the endpoint without valid cookies", () => {
      customRequest(false, IdpType.IDIR, (WEB_APP_URL: any) => {
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
      customRequest(true, IdpType.IDIR, (WEB_APP_URL: any) => {
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
    it("Should return 200 OK when calling the endpoint with valid cookies", () => {
      customRequest(true, IdpType.IDIR, (WEB_APP_URL: any) => {
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
    it("Should return 405 Method Not Allowed when calling the endpoint without valid cookies", () => {
      customRequest(false, IdpType.IDIR, (WEB_APP_URL: any) => {
        cy.request({
          url: `${WEB_APP_URL}${logoutEndpoint}`,
          method: "POST",
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.equal(405);
        });
      });
    });

    it("Should return 405 Method Not Allowed when calling the endpoint with valid cookies on forbidden origin", () => {
      customRequest(true, IdpType.IDIR, (WEB_APP_URL: any) => {
        cy.request({
          url: `${WEB_APP_URL}${logoutEndpoint}`,
          method: "POST",
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.equal(405);
        });
      });
    });

    it("Should sign out successfully when clicking on the button with valid cookies on the app page", () => {
      customRequest(true, IdpType.IDIR, (WEB_APP_URL: any) => {
        cy.visit(`${WEB_APP_URL}/admin`);
        cy.get(
          'button[data-slot="dropdown-menu-trigger"] [data-slot="avatar-fallback"]',
        ).click({ force: true });
        cy.contains("Sign out").click();
        cy.url({ timeout: 20000 }).then(() => {
          cy.origin("https://dev.loginproxy.gov.bc.ca", () => {
            cy.contains("Single Digital Gateway - IDIR").should("be.visible");
          });
        });
      });
    });
  });
});
