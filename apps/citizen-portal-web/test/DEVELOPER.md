# Citizen Portal Web Project Quality Assurance Testing Documentation

## Vitest

The citizen portal web project uses Vitest for QA testing, which is the preferred framework for its zero-config setup, mocking capabilities, and broad ecosystem support for this Node.js based project. The main focuses of QA testing for the web application are component and integration tests. Coverage test is also available with coverage threshold that increases as the project expands.

## Files and Folders

Component test files with file name suffix `**/*.test.tsx` should be placed inside the [`component`](./component) folder, whereas integration test files with file name suffix `**/*.e2e.test.tsx` should be placed inside the [integration](./integration/) folder.

| Testing Content  |     File Format     |     Folder (example)      |
| :--------------: | :-----------------: | :-----------------------: |
|  Component test  |   `**/*.test.tsx`   | [component](./component/) |
| Integration test | `**/*.e2e.test.tsx` |       [e2e](./e2e/)       |

## Configuration

Vitest is available to use with low-to-zero configurations. Refer to file [`vitest.config.ts`](./vitest.config.ts) for configuration.

## Local Testing

The API project offers three methods to run tests using Vitest. These tests are categorized into three main methods: using command lines in terminal, VSCode debugger or VScode Vitest extension.

### Terminal Testing

Scripts are added to `package.json` for quick access.

Run tests on all files with the following command line:

```bash
npm run test
```

Run coverage tests with the following command line:

```bash
npm run test:cov
```

### VSCode Vitest Extension

VSCode Vitest extension (vscode-jest) supports full jest features in vscode environment to make testing accessible for developers. Install [`Vitest`](https://marketplace.visualstudio.com/items?itemName=vitest.explorer) from the VSCode extension marketplace, and it should be available to use. Restart VSCode after installation in case it is not available. Open a test file and click on the green Run button next any test suite or test case to run tests.
