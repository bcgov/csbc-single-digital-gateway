/**
 * Custom Cypress commands for handling authentication cookies.
 */
Cypress.Commands.add("restoreCookiesFromFile", () => {
  cy.readFile("cypress/cookies/auth-cookies.json", { log: false }).then(
    (cookies) => {
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
    },
  );
});

/**
 * Custom command to log in and obtain authentication cookies, then save them to a file for later use.
 */
Cypress.Commands.add("loginToObtainCookies", () => {
  cy.env(["APP_URL"]).then(({ APP_URL }) => {
    cy.visit(APP_URL);
    cy.contains("Sign In").click();

    // Sign in using the test credentials and save the cookies to a file for later use
    cy.url({ timeout: 20000 }).then((url) => {
      cy.env(["IDTEST_URL"]).then(({ IDTEST_URL }) => {
        expect(url).to.include("/login/entry");

        // Wait for the URL to change to the login form page
        cy.origin(IDTEST_URL, () => {
          cy.env(["BCSC_TEST_USERNAME", "BCSC_TEST_PASSWORD"]).then(
            ({ BCSC_TEST_USERNAME, BCSC_TEST_PASSWORD }) => {
              cy.contains("Test with username and password").click();

              // Wait for the URL to change to the login auth page
              cy.url({ timeout: 20000 });
              cy.get('input[name="username"]').type(BCSC_TEST_USERNAME);
              cy.get('input[name="password"]').type(BCSC_TEST_PASSWORD);
              cy.contains("Continue").click();

              // Wait for the URL to change to the login username page
              cy.url({ timeout: 20000 });
              cy.contains(
                "I agree to the BC Login Service Terms of Use",
              ).click();
              cy.contains("Continue").click();
            },
          );
        });
      });
    });

    // Visit the app page and verify the csrf-token cookie exists
    cy.env(["APP_URL"]).then(({ APP_URL }) => {
      cy.visit(`${APP_URL}/app`);
      cy.getCookie("csrf-token").should("exist");
    });

    // Save the cookies to a file for later use
    cy.getCookies().then((cookies) => {
      cy.writeFile("cypress/cookies/auth-cookies.json", cookies);
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
      cy.log("Cookies saved to file after login.");
    });
  });
});
