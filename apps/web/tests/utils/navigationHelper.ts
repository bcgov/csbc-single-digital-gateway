/**
 * NavigationHelperClass is a utility class that provides functions to
 * navigate to different pages of the application during testing.
 */
class NavigationHelperClass {
  /**
   * Function to navigate to the home page of the application.
   * @returns void.
   */
  homePage() {
    cy.env(["APP_PORT"]).then(({ APP_PORT }) => {
      cy.log("APP_PORT: ", APP_PORT);
      if (!APP_PORT) {
        cy.log("APP_PORT is not defined in the environment variables");
      }
      cy.visit(`http://localhost:${APP_PORT}/`);
    });
  }
}

export const navigateHelper = new NavigationHelperClass();
