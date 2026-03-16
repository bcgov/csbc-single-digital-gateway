import { defineConfig } from "cypress";
require("dotenv").config();

export default defineConfig({
  allowCypressEnv: false,
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
    setupNodeEvents(_, config) {
      config.env.NODE_ENV = process.env.NODE_ENV;
      return config;
    },
    specPattern: [
      "**/*.cy.tsx", // Component test files format
    ],
  },
  e2e: {
    setupNodeEvents(_, config) {
      config.env.NODE_ENV = process.env.NODE_ENV;
      config.env.APP_PORT = process.env.APP_PORT;
      return config;
    },
    specPattern: [
      "**/*.e2e-cy.ts", // E2E test files format
    ],
  },
});
