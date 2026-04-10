# Web Project Quality Assurance Testing Documentation

## Jest with React testing library

The Web project uses Jest with React testing library for component testing, which covers the component-level isolation testswith a single unified toolchain. The main focuses of QA testing for the frontend application are component and end-to-end (E2E) tests, which will be executed using Cypress in the [cypress folder](../../../cypress/). 

## Files and Folders

Component test files with file name suffix `**/*.spec.tsx` should be placed inside the [components](./components/) folder. The component test files hav a `.tsx` extension, not just `.ts`. The `.tsx` extension tells the TypeScript compiler to parse the file for JSX syntax. 

|Testing Content| File Format| Folder (example)|
|:-:|:-:|:-:|
|Component test| `**/*.spec.tsx`| [app](./components/app/)|
|Coverage test| | coverage.txt [coverage](./coverage/coverage.txt)|

- Use [app.provider.spec.tsx](./components/app/app.provider.spec.tsx) as an example for component test

## Configuration

Jest is available to use with low-to-zero configurations. Small adjustments are in place to allow running tests in terminal from the project root and VSCode. 

## Local Testing

The web project offers two main methods to run tests using Jest. These tests are categorized into two main methods: using command lines in terminal, VSCode debugger or VScode Jest extension.

### Terminal Testing

Scripts are added to `package.json` for quick access. Use one of the following commands in the project root.

Run component test on all files with the following command line:

```bash
npm run test:component
```

Change directory to `apps/web` and run component test on a specific test file with the following command line:

```bash
npm run test:component "path/to/your/testfile.spec.ts"
```

Run coverage test on with the following command line:

```bash
npm run test:cov:web
```

### Debug Testing

Debug supports custom scripts [launch.json](/.vscode/launch.json) to run local tests using the "Run and Debug" functionality. 

1. Single File Testing

   While the **current test file is selected** (the file tab is open), select "Web Component Test - Current File" and click Run button.

2. All Files Testing

   To run all test files on VSCode, select either "Web Component Test - All Files" and click Run button.


3. Coverage Testing

   To run coverage test on VSCode, select "API Coverage Test" and click Run button.

4. Shortcut F5
   
   Press F5 after having selected the test method to quickly run testing in VSCode.

## CI/CD Testing

CI/CD workflows for web quality assurance testing are added to the file [qa-testing.yml](/.github/workflows/qa-testing.yml) for GitHub actions. Automated workflows will be triggered upon creating a pull request from devs' current working branch into the `develop` branch.
