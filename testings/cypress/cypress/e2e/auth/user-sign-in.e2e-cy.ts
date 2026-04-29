import { customRequest } from "../../support/requests";

describe("BCSC Authentication Sign-In", () => {
  const meEndpoint = "/api/auth/bcsc/me";
  it("Should sign in a test user and return 200 OK when calling the endpoint with valid cookies", () => {
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
