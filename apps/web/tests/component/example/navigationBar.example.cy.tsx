import { NavigationBar } from "../../../src/features/app/components/navigation-bar";
import { TestType, writeFileHelper } from "../../utils/writeFileHelper";

// Specify the title and the type of test in the syntax below
// Note that the file extension is .tsx for TS compiler to parse the file for JSX syntax
context("NavigationBarExample (component)", () => {
  // Test case: should render and display the text as "Single Digital Gateway"
  // The comments are not required in an actual test file.
  // Make sure to capitalize the first letter to make it consistent across all test files.
  it('Should render and display the text as "Single Digital Gateway"', () => {
    // Mount the NavigationBar component with parameter title set as "Single Digital Gateway"
    // Again, the comments are not required in an actual test file
    cy.mount(
      <NavigationBar
        title={"Single Digital Gateway"}
        items={[]}
        extras={<></>}
      />,
    );

    // Expect that the h1 tag to display "Single Digital Gateway"
    cy.get("h1").should("have.text", "Single Digital Gateway");
  });

  afterEach(() => {
    // Optional: Cypress supports writing specific contents to a file. Devs are welcome
    // exploit this functionality to keep testing records in local environments.
    // The test files are stored in the folder /cypress/tests/ which is ignored by Git.
    // The writeFileHelper function writes the title of each test case after it is finished.
    // The function adds a new line for the test case in the "example.component-test.txt" file.
    // 2026/03/10-09:49:01 | NavigationBar (component) | Should render and display the text as "Single Digital Gateway"
    writeFileHelper(TestType.Component, "example");
  });
});
