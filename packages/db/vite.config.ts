import path from "path";
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
      external: ["drizzle-orm", "pg", "zod", /^drizzle-orm\/.*/],
    },
  },
  plugins: [
    dts({
      include: ["src/**/*"],
      tsconfigPath: "./tsconfig.build.json",
    }),
  ],
});
