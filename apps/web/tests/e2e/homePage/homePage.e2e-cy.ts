import { navigateHelper } from "../../utils/navigationHelper";
import { TestType, writeFileHelper } from "../../utils/writeFileHelper";

// Specify the title and the type of test in the syntax below
context("HomePage (e2e)", () => {
  beforeEach("Navigate to the home page", () => {
    navigateHelper.homePage();
  });
  // Test case: should render and display the text as "Single Digital Gateway" on the home page
  // The comments are not required in an actual test file.
  // Make sure to capitalize the first letter to make it consistent across all test files.
  it('Should render and display the sign-in button with text "Sign In" on the home page', () => {
    // Uses the configured baseUrl
    cy.get("button").should("contain.text", "Sign In");
  });

  // Test case: should redirect to the IDIR login page upon clicking on the sign-in button
  // The comments are not required in an actual test file.
  // Make sure to capitalize the first letter to make it consistent across all test files.
  it("Should redirect to the IDIR login page upon clicking on the sign-in button", () => {
    // Click on the sign-in button
    cy.get("button").contains("Sign In").click();
    cy.url().should("include", "dev.loginproxy.gov.bc.ca");
  });

  afterEach(() => {
    // Optional: Cypress supports writing specific contents to a file. Devs are welcome
    // exploit this functionality to keep testing records in their local environments.
    // The test files are stored in the folder cypress/tests/ which is ignored by Git.
    // The writeFileHelper function writes the title of each test case after it is finished.
    writeFileHelper(TestType.E2E, "homePage");
  });
});
