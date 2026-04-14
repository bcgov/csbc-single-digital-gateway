import { defineConfig } from "cypress";
import { config as dotenvConfig } from "dotenv";
import { existsSync } from "node:fs";

dotenvConfig();

export default defineConfig({
  allowCypressEnv: false,
  defaultBrowser: "chrome",
  e2e: {
    setupNodeEvents(on, config) {
      on("task", {
        fileExists(filePath) {
          return existsSync(filePath);
        },
      });
      config.env.LOGIN_URL = "https://idtest.gov.bc.ca";
      config.env.WEB_APP_URL = process.env.WEB_APP_URL;
      config.env.TEST_USERNAME = process.env.CYPRESS_TEST_USERNAME;
      config.env.TEST_PASSWORD = process.env.CYPRESS_TEST_PASSWORD;
      if (process.env.REPORT === "true") {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./node_modules/cypress-mochawesome-reporter/plugin")(on);
      }
      return config;
    },
    specPattern: ["cypress/e2e/**/*.e2e-cy.ts"],
    fixturesFolder: "fixtures",
    reporter:
      process.env.REPORT === "true"
        ? "./node_modules/cypress-mochawesome-reporter"
        : "spec",
    reporterOptions: {
      charts: true,
      reportPageTitle: "E2E Test Report",
      reportFilename: "report-e2e",
      embeddedScreenshots: true,
      inlineAssets: true,
      saveAllAttempts: false,
      video: false,
      screenshotOnRunFailure: false,
    },
    screenshotOnRunFailure: false,
  },
});
