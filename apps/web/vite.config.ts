import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import runtimeEnv from "vite-plugin-runtime-env";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      generatedRouteTree: "./src/app/routeTree.gen.ts",
      routesDirectory: "./src/app/routes",
      target: "react",
    }),
    react(),
    runtimeEnv(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/api/consent": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/consent-proxy/, "api/consent-proxy"),
      },
    },
  },
});
