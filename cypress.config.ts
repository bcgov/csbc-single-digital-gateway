import { defineConfig } from "cypress";

export default defineConfig({
  allowCypressEnv: process.env.allowCypressEnv === "true",
  env: {
    nodeEnv: process.env.NODE_ENV,
  },
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
    specPattern: [
      "**/*.cy.tsx", // Component test files with suffix ending in .cy.tsx
    ],
  },
  e2e: {
    specPattern: [
      "**/*.e2e-cy.ts", // E2E test files with suffix ending in .e2e-cy.ts
    ],
  },
});
