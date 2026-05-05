import { IdpType } from "../utils/idp";

/**
 * Logs in to the application using the specified identity provider type to obtain authentication cookies,
 * then saves them to a file for later use.
 * @param {IdpType} idpType - The type of identity provider to log in with ("bcsc" or "idir").
 */
const loginToObtainCookies = (idpType: IdpType) => {
  if (idpType === "bcsc") {
    cy.bcscLoginToObtainCookies();
  } else {
    cy.idirLoginToObtainCookies();
  }
};

/**
 * Reads cookies from the specified file and sets them in the browser for the current domain.
 * If the file does not exist, obtain new cookies by logging in. If the file exists,
 * check if the cookies are valid by making a request to the /api/auth/{idpType}/me endpoint.
 * If the cookies are invalid, obtain new cookies by logging in.
 * @param {IdpType} idpType - The type of identity provider to log in with ("bcsc" or "idir").
 */
export const restoreCookies = (idpType: IdpType) => {
  cy.task("fileExists", `cypress/cookies/${idpType}-auth-cookies.json`).then(
    (exists) => {
      if (exists) {
        cy.env(["WEB_APP_URL"]).then(({ WEB_APP_URL }) => {
          cy.restoreCookiesFromFile(idpType);
          cy.request({
            url: `${WEB_APP_URL}/api/auth/${idpType}/me`,
            method: "GET",
            failOnStatusCode: false,
          }).then((response) => {
            if (response.status !== 200) {
              cy.log("Existing cookies are invalid, obtaining new cookies");
              loginToObtainCookies(idpType);
            }
          });
        });
      } else {
        cy.log("No cookies file found to restore");
        loginToObtainCookies(idpType);
      }
    },
  );
};

/**
 * Executes a custom request after optionally restoring cookies.
 * @param {boolean} requireLogin - Whether to require login cookies before making the request.
 * @param {Function} func - The function to execute with the WEB_APP_URL.
 */
export const customRequest = (
  requireLogin: boolean,
  idpType: IdpType,
  func: Function,
) => {
  cy.env(["WEB_APP_URL"]).then(({ WEB_APP_URL }) => {
    const webUrl = idpType === "bcsc" ? WEB_APP_URL : `${WEB_APP_URL}/admin`;
    cy.visit(webUrl);
    if (requireLogin) {
      restoreCookies(idpType);
    } else {
      cy.clearAllCookies();
    }
    func(webUrl);
  });
};
