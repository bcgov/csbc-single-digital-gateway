# Web Project Quality Assurance Testing Documentation

## Cypress

The Web project uses Cypress for end-to-end (E2E) testing, which covers full E2E browser flows, with a single unified toolchain.

## Files and Folders

E2E test files with file name suffix `**/*.e2e-cy.ts` should be placed inside `cypress/e2e` folder.

|Testing Content| File Format| Folder (example)|
|:-:|:-:|:-:|
|E2E test| `**/*.e2e-cy.ts` | [e2e](./e2e/)|


## Configuration

The primary configuration file for Cypress with TypeScript is [cypress.config.ts](./cypress.config.ts), which allows you to specify global settings, test type-specific options, and define Node events for interacting with the file system or other backend tasks. Visit [link](https://docs.cypress.io/app/references/configuration) for more information about Cypress configuration.

## Local Testing

Cypress supports a variety of ways to run tests on local environments. These tests are categorized into three main methods: using command lines in terminal, VSCode debugger or the Cypress launchpad. Add `.env` file in the Cypress folder. Consult the [test account page](https://citz-do.atlassian.net/wiki/spaces/Elidya/pages/606208240/BCSC+Test+Accounts) for test user credentials. Make sure to activate the test user before continuing.

```
APP_PORT=5173
IDTEST_URL=https://idtest.gov.bc.ca
BCSC_TEST_USERNAME=
BCSC_TEST_PASSWORD=
```

### Terminal Testing

Scripts are added to `package.json` for quick access. Use one of the following commands in the project root.

Cypress E2E tests require the application to be running locally because they act as a user interacting with a real browser. Run E2E test on E2E files with the following command line:

```bash
npm run dev
npm run test:e2e
```

Run E2E test on a specific test file with the following command line:

```bash
npm run test:e2e -- --spec "path/to/your/testFile.e2e-cy.ts"
```

### Cypress Launchpad

Cypress supports an interactive launchpad to run either E2E or component tests. Open the launchpad with the following command line and follow the instructions. Visit [open the app](https://docs.cypress.io/app/get-started/open-the-app) for more information about the launchpad.

```bash
npm run test:open
```

### VSCode Testing

VSCode supports custom scripts [launch.json](/.vscode/launch.json) to run local tests using the Run and Debug. 

#### Single File Testing

While the **current test file is selected** (the file tab is open), select "Cypress E2E Test - Current File" and click Run button. E2E tests require the application to be running concurrently.

#### All Files Testing

To run all test files on VSCode, select "Cypress E2E Test - All Files" and click Run button. E2E tests require the application to be running concurrently.

## CI/CD Testing

CI/CD workflows for web quality assurance testing are added to the file [qa-testing.yml](/.github/workflows/qa-testing.yml) for GitHub actions. Automated workflows will be triggered upon creating a pull request from devs' current working branch into the `develop` branch.

## Test Reports

Test reports are available for the web project in developers' local environments. Refer to [cypress.config.ts](./cypress.config.ts) for configurations. Run the following commands to generate a component test report file `report-e2e.html` in the folder `cypress/reports/html`.

```bash
npm run test:e2e:report
```