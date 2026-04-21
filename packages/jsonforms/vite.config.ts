import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@repo/ui",
        /^@repo\/ui\//,
        "@jsonforms/core",
        /^@jsonforms\/core\//,
        "@jsonforms/react",
        /^@jsonforms\/react\//,
      ],
    },
  },
  plugins: [
    react(),
    dts({
      include: ["src/**/*"],
      tsconfigPath: "./tsconfig.app.json",
    }),
  ],
});
