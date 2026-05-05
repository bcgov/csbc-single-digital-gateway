import { customRequest } from "../../support/requests";
import { IdpType } from "../../utils/idp";

describe("IDIR Authentication Sign-In", () => {
  const meEndpoint = "/api/auth/idir/me";
  it("Should sign in a IDIR user and return 200 OK when calling the endpoint with valid cookies", () => {
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
