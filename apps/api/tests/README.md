# API Project Quality Assurance Testing Documentation

## Jest

The API project uses Jest for QA testing, which is the preferred framework for its zero-config setup, mocking capabilities, and broad ecosystem support for this Node.js based project. The main focuses of QA testing for the backend application are unit and integration tests. Coverage test is also available with coverage threshold that increases as the project expands.

## Files and Folders

Unit test files with file name suffix `**/*.spec.ts` should be placed inside `__tests__` folder alongside the code they test for easy access, whereas integration test files with file name suffix `**/*.int-spec.ts` should be placed inside the [integration](./integration/) folder. 

|Testing Content| File Format| Folder (example)|
|:-:|:-:|:-:|
|Unit test| `**/*.spec.ts`| [health/__tests__](../src/modules/health/__tests__/)|
|Integration test| `**/*.int-spec.ts` | [integration](./integration/)|
|Coverage test| | coverage.txt [coverage](./coverage/coverage.txt)|

- Use [health.controller.example.spec.ts](../src/modules/health/__tests__/health.controller.example.spec.ts) as an example for unit test
- Use [app.controller.int-spec.ts](./integration/app/app.controller.int-spec.ts) as an example for integration test

## Configuration

Jest is available to use with low-to-zero configurations. Small adjustments are in place to allow running tests in terminal from the project root and VSCode. 

## Local Testing

The API project offers three methods to run tests using Jest. These tests are categorized into three main methods: using command lines in terminal, VSCode debugger or VScode Jest extension.

### Terminal Testing

Scripts are added to `package.json` for quick access. Use one of the following commands in the project root or `/apps/api` folder.

Run unit test on all files with the following command line:

```bash
npm run test:unit
```

Run integration test on integration files with the following command line:

```bash
npm run test:int
```

Change directory to `apps/api` and run unit test on a specific test file (same for integration test) with the following command line:

```bash
npm run test "path/to/your/testfile.spec.ts"
```

Run coverage test on with the following command line:

```bash
npm run test:cov
```

### Debug Testing

Debug supports custom scripts [launch.json](/.vscode/launch.json) to run local tests using the "Run and Debug" functionality. 

1. Single File Testing

   While the **current test file is selected** (the file tab is open), select either "API Unit Test - Current File" or "API integration Test - Current File" and click Run button.

2. All Files Testing

   To run all test files on VSCode, select either "API Unit Test - All Files" or "API integration Test - All Files" and click Run button.

3. Coverage Testing

   To run coverage test on VSCode, select "API Coverage Test" and click Run button.

**Note**: although VSCode testing offers convenience and quick access to run testings, the debugger session itself is waiting for an explicit closure command even though the program's execution has finished. While using `turbo` with `ts-jest` for `launch.json` scripts may need further improvements for better integration, manually stop the debugger is required by clicking the "Stop" button or pressing "Shift + F5" on the keyboard.

### VSCode Jest Extension

VSCode Jest extension (vscode-jest) supports full jest features in vscode environment to make testing accessible for developers. Install "Jest" from the VSCode extension marketplace, and it should be available to use. In case it is not available, follow the setup steps below:

- Open the VS Code Command Palette (press Ctrl+Shift+P or Cmd+Shift+P on Mac).
- Type and select "Jest: Setup Extension".
- Choose "Setup Jest Command" and enter the following the prompts.
  - "csbc-single-digital-gateway"
  - edit rootPath: `apps/api`
  - edit jestCommandLine: `npm run test:unit --`
  - Click "Save Settings"

Open a test file and click on the green Run button next any test suite or test case to run tests.

## CI/CD Testing

CI/CD workflows for API quality assurance testing are added to the file [qa-testing.yml](/.github/workflows/qa-testing.yml) for GitHub actions. Automated workflows will be triggered upon creating a pull request from devs' current working branch into the `develop` branch.