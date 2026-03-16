export const TestType = {
  Component: "Component",
  E2E: "E2E",
} as const;

export type TestType = (typeof TestType)[keyof typeof TestType];

/**
 * Function to return timestamp in the format of year:month:day-hour:minute:second.
 * @returns timestamp string.
 */
const formatTimestamp = () => {
  const date = new Date();

  const year = date.getFullYear();
  // Month is 0-indexed, so add 1
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  // Helper function to pad single digits with a leading zero.
  const pad = (day: number) => String(day).padStart(2, "0");

  return `${year}/${pad(month)}/${pad(day)}-${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Helper function to write the title of each test case to a file for testing in local environment.
 * @param {TestType} testType The type of the test, either Component or E2E.
 * @param {string} filePrefix The file prefix to add to the file name.
 * @returns void.
 */
export const writeFileHelper = (testType: TestType, filePrefix: string) => {
  let fileName: string;
  if (testType === TestType.Component) {
    fileName = `${filePrefix}.component-test.txt`;
  } else if (testType === TestType.E2E) {
    fileName = `${filePrefix}.e2e-test.txt`;
  }
  cy.env(["NODE_ENV"]).then(({ NODE_ENV }) => {
    if (NODE_ENV === "local") {
      const fullTitlePath = Cypress.currentTest.titlePath;
      const content = `${testType} Test | ${formatTimestamp()} | ${fullTitlePath.join(" | ")}\n`;
      cy.writeFile(`cypress/tests/${fileName}`, `${content}`, {
        flag: "a+",
      });
    }
  });
};
