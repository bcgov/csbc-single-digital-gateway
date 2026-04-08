# Web Project Quality Assurance Testing Documentation

## Jest with React testing library

The Web project uses Jest with React testing library for QA testing, which covers both component-level isolation tests and full E2E browser flows, with a single unified toolchain. The main focuses of QA testing for the frontend application are component and end-to-end (E2E) tests. 

## Files and Folders

Component test files with file name suffix `**/*.spec.tsx` should be placed inside `__tests__` folder alongside the code they test for easy access, whereas E2E test files with file name suffix `**/*.e2e-spec.tsx` should be placed inside the [e2e](./e2e/) folder. The component test files hav a `.tsx` extension, not just `.ts`. The `.tsx` extension tells the TypeScript compiler to parse the file for JSX syntax. 

|Testing Content| File Format| Folder (example)|
|:-:|:-:|:-:|
|Component test| `**/*.spec.tsx`| [app](../src/app/__tests__/)|
|E2E test| `**/*.e2e-spec.ts` | [e2e](./e2e/)|
|Coverage test| | coverage.txt [coverage](./coverage/coverage.txt)|

- Use [app.provider.spec.tsx](../src/app/__tests__/app.provider.spec.tsx) as an example for component test
- Use [home-page.e2e-spec](./e2e/homePage/home-page.e2e-spec.ts) as an example for E2E test

## Configuration

Jest is available to use with low-to-zero configurations. Small adjustments are in place to allow running tests in terminal from the project root and VSCode. 

## Local Testing

The web project offers two main methods to run tests using Jest. These tests are categorized into two main methods: using command lines in terminal, VSCode debugger or VScode Jest extension.

### Terminal Testing

Scripts are added to `package.json` for quick access. Use one of the following commands in the project root.

Run unit test on all files with the following command line:

```bash
npm run test:component
```

Run integration test on integration files with the following command line:

```bash
npm run test:e2e
```

Change directory to `apps/web` and run unit test on a specific test file (same for integration test) with the following command line:

```bash
npm run test:component "path/to/your/testfile.spec.ts"
```

### Debug Testing

Debug supports custom scripts [launch.json](/.vscode/launch.json) to run local tests using the "Run and Debug" functionality. 

1. Single File Testing

   While the **current test file is selected** (the file tab is open), select either "Web Component Test - Current File" or "Web E2E Test - Current File" and click Run button.

2. All Files Testing

   To run all test files on VSCode, select either "Web Component Test - All Files" or "Web E2E Test - All Files" and click Run button.

3. Shortcut F5
   
   Press F5 after having selected the test method to quickly run testing in VSCode.

## CI/CD Testing

CI/CD workflows for web quality assurance testing are added to the file [qa-testing.yml](/.github/workflows/qa-testing.yml) for GitHub actions. Automated workflows will be triggered upon creating a pull request from devs' current working branch into the `develop` branch.

## Test Reports

Test reports are available for the web project in developers' local environments. Refer to [cypress.config.ts](../cypress.config.ts) for configurations. Run the following commands to generate a component test report file `report-component.html` (same for E2E test) in the folder `cypress/reports/html`.

```bash
npm run cy:component:report
```