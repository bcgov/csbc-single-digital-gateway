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
    specPattern: [
      "**/*.cy.tsx", // Component test files format
    ],
    supportFile: "apps/web/cypress/support/component.ts",
    indexHtmlFile: "apps/web/cypress/support/component-index.html",
  },
  e2e: {
    setupNodeEvents(_, config) {
      config.env.APP_PORT = process.env.APP_PORT;
      return config;
    },
    specPattern: [
      "**/*.e2e-cy.ts", // E2E test files format
    ],
    supportFile: "apps/web/cypress/support/e2e.ts",
  },
});
