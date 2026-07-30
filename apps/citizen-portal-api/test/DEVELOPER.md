# Citizen Portal API Project Quality Assurance Testing Documentation

## Vitest

The Citizen Portal API project uses Vitest for QA testing, which is the preferred framework for its zero-config setup, mocking capabilities, and broad ecosystem support for this Node.js based project. The main focuses of QA testing for the Citizen Portal API application are unit and integration tests. Coverage test is also available with coverage threshold that increases as the project expands.

## Files and Folders

Unit test files with file name suffix `**/*.unit.test.ts` should be placed inside the [`unit`](./unit) folder, whereas integration test files with file name suffix `**/*.e2e.test.ts` should be placed inside the [integration](./integration/) folder.

| Testing Content  |     File Format     | Folder (example) |
| :--------------: | :-----------------: | :--------------: |
|    Unit test     | `**/*.unit.test.ts` | [unit](./unit/)  |
| Integration test | `**/*.e2e.test.ts`  |  [e2e](./e2e/)   |

## Configuration

Vitest is available to use with low-to-zero configurations. Refer to file [`vitest.config.ts`](./vitest.config.ts) for configuration.

## Local Testing

The API project offers three methods to run tests using Vitest. These tests are categorized into three main methods: using command lines in terminal, VSCode debugger or VScode Vitest extension.

### Terminal Testing

Scripts are added to `package.json` for quick access.

Run unit test on all files with the following command line:

```bash
npm run test:unit
```

Run integration test on integration files with the following command line:

```bash
npm run test:e2e
```

Change directory to `apps/api` and run unit test on a specific test file (same for integration test) with the following command line:

```bash
npm run test "path/to/your/testfile.spec.ts"
```

Run coverage test with one of the following command lines:

```bash
npm run test:cov:unit
```

or

```bash
npm run test:cov:e2e
```

### VSCode Vitest Extension

VSCode Vitest extension (vscode-jest) supports full jest features in vscode environment to make testing accessible for developers. Install [`Vitest`](https://marketplace.visualstudio.com/items?itemName=vitest.explorer) from the VSCode extension marketplace, and it should be available to use. Restart VSCode after installation in case it is not available.

Open a test file and click on the green Run button next any test suite or test case to run tests.

## CI/CD Testing

CI/CD workflows for API quality assurance testing are added to the file [qa-testing.yml](/.github/workflows/qa-testing.yml) for GitHub actions. Automated workflows will be triggered upon creating a pull request from devs' current working branch into the `develop` branch.
