import { defineConfig } from "cypress";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  allowCypressEnv: false,
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
    fixturesFolder: "tests/fixtures",
    supportFile: "cypress/support/component.ts",
    indexHtmlFile: "cypress/support/component-index.html",
    specPattern: [
      "**/*.cy.tsx", // Component test files format
    ],
    reporter:
      process.env.ALLOW_REPORT === "true"
        ? "../../node_modules/cypress-mochawesome-reporter"
        : "spec",
    reporterOptions: {
      charts: true,
      reportPageTitle: "Component Test Report",
      reportFilename: "report-component",
      embeddedScreenshots: true,
      inlineAssets: true,
      saveAllAttempts: false,
      video: false,
      screenshotOnRunFailure: false,
    },
    screenshotOnRunFailure: false,
    setupNodeEvents(on, config) {
      if (process.env.ALLOW_REPORT === "true") {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("../../node_modules/cypress-mochawesome-reporter/plugin")(on);
      }
      return config;
    },
  },
  e2e: {
    supportFile: "cypress/support/e2e.ts",
    specPattern: [
      "**/*.e2e-cy.ts", // E2E test files format
    ],
    reporter:
      process.env.REPORT === "true"
        ? "../../node_modules/cypress-mochawesome-reporter"
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
    setupNodeEvents(on, config) {
      if (process.env.REPORT === "true") {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("../../node_modules/cypress-mochawesome-reporter/plugin")(on);
      }
      config.env.APP_PORT = process.env.APP_PORT;
      return config;
    },
  },
});
