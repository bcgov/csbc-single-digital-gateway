# API Project Quality Assurance Testing Documentation

## Jest

The API project uses Jest for QA testing, which is the preferred framework for its zero-config setup, mocking capabilities, and broad ecosystem support for this Node.js based project. The main focuses of QA testing for the backend application are unit and end-to-end (E2E) tests.

## Files and Folders

Unit test files with file name suffix `**/*.spec.ts` should be created and stored inside the [unit](./unit/) folder, whereas E2E test files with file name suffix `**/*.e2e-spec.ts` should be placed inside the [e2e](./e2e/) folder. 

|Testing Content| File Format| Folder|
|:-:|:-:|:-:|
|Unit test| `**/*.spec.ts`| [unit](./unit/)|
|E2E test| `**/*.e2e-spec.ts` | [e2e](./e2e/)|

- Use [health.controller.example.spec.ts](./unit/example/health.controller.example.spec.ts) as an example for unit test
- Use [app.controller.example.e2e-spec.ts](./e2e/example/app.controller.example.e2e-spec.ts) as an example for E2E test

## Configuration

Jest is available to use with low-to-zero configurations. Small adjustments are in place to allow running tests in terminal from the project root and VSCode. 

## Local Testing

The API project offers two main methods to run tests using Jest. These tests are categorized into two main methods: using command lines in terminal or using VSCode debugger.

### Terminal Testing

Scripts are added to `package.json` for quick access. Use one of the following commands in the project root or `/apps/api` folder.

Run unit test on all files with the following command line:

```bash
npm run test
```

Run E2E test on E2E files with the following command line:

```bash
npm run test:e2e
```

Change directory to `apps/api` and run unit test on a specific test file (same for E2E test) with the following command line:

```bash
npm run test "path/to/your/testfile.spec.ts"
```

### VSCode Testing

VSCode supports custom scripts [launch.json](/.vscode/launch.json) to run local tests using the Run and Debug. 

1. Single File Testing

   While the **current test file is selected** (the tab window is open), select either "API Unit Test - Current File" or "API E2E Test - Current File" and click Run button.

2. All Files Testing

   To run all test files on VSCode, select either "API Unit Test - All Files" or "API E2E Test - All Files" and click Run button.

**Note**: although VSCode testing offers convenience and quick access to run testings, the debugger session itself is waiting for an explicit closure command even though the program's execution has finished. While using `turbo` with `ts-jest` for `launch.json` scripts may need further improvements for better integration, manually stop the debugger is required by clicking the "Stop" button or pressing "Shift + F5" on the keyboard.

## CI/CD Testing

CI/CD workflows for API quality assurance testing are added to the file [qa-testing.yml](/.github/workflows/qa-testing.yml) for GitHub actions. Automated workflows will be triggered upon creating a pull request from devs' current working branch into the `develop` branch.