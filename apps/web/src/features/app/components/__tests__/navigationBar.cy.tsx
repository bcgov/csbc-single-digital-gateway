import { AuthWrapper } from "../../../../../tests/utils/authWrapper";
import { NavigationBar } from "../navigation-bar";

// Specify the title and the type of test in the syntax below
// Note that the file extension is ".tsx" for TS compiler to parse the file for JSX syntax
context("NavigationBarExample (component)", () => {
  // Test case: should display the text as "Single Digital Gateway" when the user is not authenticated
  // The comments are not required in an actual test file.
  // Make sure to capitalize the first letter to make it consistent across all test files.
  it('Should display the title as "Single Digital Gateway" when the user is not authenticated', () => {
    // Mount the NavigationBar component with parameter title set as "Single Digital Gateway".
    // The AuthWrapper component wraps the NavigationBar component with the isAuthenticated being false.
    // The comments are not required in an actual test file
    cy.mount(
      <AuthWrapper authState={{ isAuthenticated: false }}>
        <NavigationBar
          title={"Single Digital Gateway"}
          items={[]}
          extras={<></>}
        />
      </AuthWrapper>,
    );

    // Expect that the class ".text-xl.font-bold" to display "Single Digital Gateway".
    cy.get(".text-xl.font-bold").should("have.text", "Single Digital Gateway");
  });
});
