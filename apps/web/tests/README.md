# Web Project Quality Assurance Testing Documentation

## Cypress

The Web project uses Cypress for QA testing, which covers both component-level isolation tests and full E2E browser flows, with a single unified toolchain. The main focuses of QA testing for the frontend application are component and end-to-end (E2E) tests. 

## Files and Folders

Component test files with file name suffix `**/*.cy.tsx` should be placed alongside the code they test for easy access, whereas E2E test files with file name suffix `**/*.e2e-cy.ts` should be placed inside the [e2e](./e2e/) folder. The component test files hav a `.tsx` extension, not just `.ts`. The `.tsx` extension tells the TypeScript compiler to parse the file for JSX syntax. 

|Testing Content| File Format| Folder (example)|
|:-:|:-:|:-:|
|Component test| `**/*.cy.tsx`| [navigation-bar](../src/features/app/components/navigation-bar/)|
|E2E test| `**/*.e2e-cy.ts` | [e2e](./e2e/)|

- Use [navigationBar.cy.tsx](../src/features/app/components/navigation-bar/navigationBar.cy.tsx) as an example for component test
- Use [homePage.example.e2e-cy.ts](./e2e/example/homePage.example.e2e-cy.ts) as an example for E2E test

## Configuration

The primary configuration file for Cypress with TypeScript is [cypress.config.ts](/cypress.config.ts), which allows you to specify global settings, test type-specific options (end-to-end or component testing), and define Node events for interacting with the file system or other backend tasks. Visit [link](https://docs.cypress.io/app/references/configuration) for more information about Cypress configuration.

## Local Testing

Cypress supports a variety of ways to run tests on local environments. These tests are categorized into three main methods: using command lines in terminal, VSCode debugger or the Cypress launchpad. Cypress supports writing specific contents to a file. Add `.env` file in the project root to use this functionality to keep testing records in local environments. 

```
NODE_ENV=local
```

### Terminal Testing

Scripts are added to `package.json` for quick access. Use one of the following commands in the project root.

Run component test on all files with the following command line:

```bash
npm run cy:component
```

Cypress E2E tests require the application to be running locally because they act as a user interacting with a real browser. Run E2E test on E2E files with the following command line:

```bash
npm run dev
npm run cy:e2e
```

Run component test on a specific test file (same for E2E test) with the following command line:

```bash
npm run cy:component -- --spec "path/to/your/testFile.cy.ts"
```

### Cypress Launchpad

Cypress supports an interactive launchpad to run either E2E or component tests. Open the launchpad with the following command line and follow the instructions. Visit [open the app](https://docs.cypress.io/app/get-started/open-the-app) for more information about the launchpad.

```bash
npm run cypress:open
```

### VSCode Testing

VSCode supports custom scripts [launch.json](/.vscode/launch.json) to run local tests using the Run and Debug. 

#### Single File Testing

While the **current test file is selected** (the tab window is open), select either "Web Component Test - Current File" or "Web E2E Test - Current File" and click Run button. E2E tests require the application to be running concurrently.

#### All Files Testing

To run all test files on VSCode, select either "Web Component Test - All Files" or "Web E2E Test - All Files" and click Run button. E2E tests require the application to be running concurrently.

## CI/CD Testing

CI/CD workflows for web quality assurance testing are added to the file [qa-testing.yml](/.github/workflows/qa-testing.yml) for GitHub actions. Automated workflows will be triggered upon creating a pull request from devs' current working branch into the `develop` branch.