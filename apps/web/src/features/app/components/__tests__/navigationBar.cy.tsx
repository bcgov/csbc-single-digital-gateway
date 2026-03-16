import { AuthWrapper } from "../../../../../tests/utils/authWrapper";
import {
  TestType,
  writeFileHelper,
} from "../../../../../tests/utils/writeFileHelper";
import { NavigationBar } from "../navigation-bar";

// Specify the title and the type of test in the syntax below
// Note that the file extension is ".tsx" for TS compiler to parse the file for JSX syntax
context("NavigationBarExample (component)", () => {
  // Test case: should render and display the text as "Single Digital Gateway"
  // The comments are not required in an actual test file.
  // Make sure to capitalize the first letter to make it consistent across all test files.
  it('Should render and display the title as "Single Digital Gateway"', () => {
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

  afterEach(() => {
    // Optional: Cypress supports writing specific contents to a file. Devs are welcome
    // exploit this functionality to keep testing records in local environments.
    // The test files are stored in the folder /cypress/tests/ which is ignored by Git.
    // The writeFileHelper function writes the title of each test case after it is finished.
    // The function adds a new line for the test case in the "navigationBar.component-test.txt" file.
    writeFileHelper(TestType.Component, "navigationBar");
  });
});
