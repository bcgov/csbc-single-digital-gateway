/**
 * Reads cookies from the specified file and sets them in the browser for the current domain.
 * If the file does not exist, obtain new cookies by logging in. If the file exists,
 * check if the cookies are valid by making a request to the /api/auth/bcsc/me endpoint.
 * If the cookies are invalid, obtain new cookies by logging in.
 */
export const restoreCookies = () => {
  cy.task("fileExists", "cypress/fixtures/auth-cookies.json").then((exists) => {
    if (exists) {
      cy.env(["APP_URL"]).then(({ APP_URL }) => {
        cy.restoreCookiesFromFile();
        cy.request({
          url: `${APP_URL}/api/auth/bcsc/me`,
          method: "GET",
          failOnStatusCode: false,
        }).then((response) => {
          if (response.status !== 200) {
            cy.log("Existing cookies are invalid, obtaining new cookies");
            cy.loginToObtainCookies();
          }
        });
      });
    } else {
      cy.log("No cookies file found to restore");
      cy.loginToObtainCookies();
    }
  });
};

/**
 * Executes a custom request after optionally restoring cookies.
 * @param requireLogin - Whether to require login cookies before making the request.
 * @param func - The function to execute with the APP_URL.
 */
export const customRequest = (requireLogin: boolean, func: Function) => {
  cy.env(["APP_URL"]).then(({ APP_URL }) => {
    cy.visit(APP_URL);
    if (requireLogin) restoreCookies();
    func(APP_URL);
  });
};
