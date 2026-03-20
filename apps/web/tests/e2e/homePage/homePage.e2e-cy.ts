import { navigateHelper } from "../../utils/navigationHelper";

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
});
