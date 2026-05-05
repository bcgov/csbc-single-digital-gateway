import { IdpType } from "../utils/idp";

/**
 * Custom Cypress commands for handling authentication cookies.
 * @param {IdpType} idpType - The type of identity provider ("bcsc" or "idir") to determine which cookies to restore.
 */
Cypress.Commands.add("restoreCookiesFromFile", (idpType: IdpType) => {
  cy.readFile(`cypress/cookies/${idpType}-auth-cookies.json`, {
    log: false,
  }).then((cookies) => {
    cookies.forEach((cookie: any) => {
      cy.setCookie(cookie.name, cookie.value, {
        domain: cookie.domain,
        path: cookie.path,
        expiry: cookie.expiry,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      });
    });
  });
});

/**
 * Custom command to log in and obtain authentication cookies for BCSC test accounts,
 * then save them to a file for later use.
 */
Cypress.Commands.add("bcscLoginToObtainCookies", () => {
  cy.env(["WEB_APP_URL"]).then(({ WEB_APP_URL }) => {
    cy.visit(WEB_APP_URL);
    cy.contains("Sign In").click();

    // Sign in using the test credentials and save the cookies to a file for later use
    cy.url({ timeout: 20000 }).then((url) => {
      expect(url).to.include("/login/entry");

      // Wait for the URL to change to the login form page
      cy.origin(url, () => {
        cy.env(["BCSC_USERNAME", "BCSC_PASSWORD"]).then(
          ({ BCSC_USERNAME, BCSC_PASSWORD }) => {
            cy.contains("Test with username and password").click();

            // Wait for the URL to change to the login auth page
            cy.url({ timeout: 20000 });
            cy.log("BCSC_USERNAME; ", BCSC_USERNAME);
            cy.get('input[name="username"]').type(BCSC_USERNAME);
            cy.get('input[name="password"]').type(BCSC_PASSWORD);
            cy.contains("Continue").click();

            // Wait for the URL to change to the login username page
            cy.url({ timeout: 20000 });
            cy.contains("I agree to the BC Login Service Terms of Use").click();
            cy.contains("Continue").click();
          },
        );
      });
    });

    // Visit the app page and verify the csrf-token cookie exists
    cy.env(["WEB_APP_URL"]).then(({ WEB_APP_URL }) => {
      cy.visit(`${WEB_APP_URL}/app`);
      cy.getCookie("csrf-token").should("exist");
    });

    // Save the auth cookies to a file for later use
    cy.getCookies().then((cookies) => {
      cy.writeFile("cypress/cookies/bcsc-auth-cookies.json", cookies);
      cookies.forEach((cookie: any) => {
        cy.setCookie(cookie.name, cookie.value, {
          domain: cookie.domain,
          path: cookie.path,
          expiry: cookie.expiry,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
        });
      });
      cy.log("BCSC auth cookies saved to file after login.");
    });
  });
});

/**
 * Custom command to log in and obtain authentication cookies for IDIR test accounts,
 * then save them to a file for later use.
 */
Cypress.Commands.add("idirLoginToObtainCookies", () => {
  cy.env(["WEB_APP_URL"]).then(({ WEB_APP_URL }) => {
    const adminUrl = `${WEB_APP_URL}/admin`;
    cy.visit(adminUrl);
    cy.contains("Get Started").click();

    // Sign in using the test credentials and save the cookies to a file for later use
    cy.url({ timeout: 20000 }).then((url) => {
      expect(url).to.include("login.microsoftonline.com");

      // Wait for the URL to change to the login form page
      cy.origin("https://login.microsoftonline.com", () => {
        cy.env(["IDIR_USERNAME", "IDIR_PASSWORD"]).then(
          ({ IDIR_USERNAME, IDIR_PASSWORD }) => {
            // Wait for the URL to change to the login auth page
            cy.url({ timeout: 20000 });
            cy.get('input[type="email"]').type(IDIR_USERNAME);
            cy.contains("Next").click();
            cy.url({ timeout: 20000 });
            cy.get('input[type="password"]').type(IDIR_PASSWORD);
            cy.contains("Sign in").click();

            // Wait for user to authenticate with MFA and click "Yes"
            cy.wait(20000);
          },
        );
      });
    });

    // Visit the admin page and verify the csrf-token cookie exists
    cy.visit(adminUrl);
    cy.getCookie("csrf-token").should("exist");

    // Save the auth cookies to a file for later use
    cy.getCookies().then((cookies) => {
      cy.writeFile("cypress/cookies/idir-auth-cookies.json", cookies);
      cookies.forEach((cookie: any) => {
        cy.setCookie(cookie.name, cookie.value, {
          domain: cookie.domain,
          path: cookie.path,
          expiry: cookie.expiry,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
        });
      });
      cy.log("IDIR auth cookies saved to file after login.");
    });
  });
});
