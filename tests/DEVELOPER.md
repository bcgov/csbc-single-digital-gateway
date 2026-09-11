# SDG Quality Assurance End-to-end Testing Documentation

## Playwright

The SDG project uses Playwright for end-to-end testing. Playwright is a free, open-source automation framework developed by Microsoft for end-to-end (E2E) testing of modern web applications. It allows developers and QA engineers to programmatically control web browsers to simulate real user interactions, such as clicking buttons, filling out forms, and verifying page content.

## Files and Folders

Playwright end-to-end test files with file name suffix `**/*.pw.ts` should be placed inside the [`playwright/tests`](./playwright/tests/) folder. Client-specific E2E tests are placed inside the [`client`](./playwright/tests/client/) folder, and platform-specific E2E tests are placed inside the [`platform`](./playwright/tests/platform/) folder.

|    Testing Content     | File Format  |             Folder (example)             |
| :--------------------: | :----------: | :--------------------------------------: |
|  Client-specific test  | `**/*.pw.ts` |   [client](./playwright/tests/client/)   |
| Platform-specific test | `**/*.pw.ts` | [platform](./playwright/tests/platform/) |

## Configuration

Playwright is available to use with low-to-zero configurations. Refer to file [`playwright.config.ts`](/playwright.config.ts) for configuration. Use the following environment variables in the `.env` file in the root directory.

```
CLIENT_URL=http://localhost:3000
PLATFORM_URL=http://localhost:3001
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=sdg
DB_PORT=5432
```

## Local Testing

Playwright offers several ways to run E2E tests. Due to the complexity of the project, it is recommended to use the VSCode Playwright extension to run these tests. Since E2E tests require that both backend and frontend applications are running, run `npm run dev` in separate terminals to start them before running the tests.

### Command Line

```sh
# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npx playwright test tests/playwright/tests/platform/account.pw.ts
```

### VSCode Playwright Extension

VSCode Playwright extension supports full Playwright features in vscode environment to make testing accessible for developers. Install [`Playwright Test for VSCode`](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) from the VSCode extension marketplace, and it should be available to use. Restart VSCode after installation in case it is not available. Follow the instructions on the extension page to properly set up the VSCode environment for Playwright testing. Open a test file and click on the green Run button next any test suite or test case to run tests.
