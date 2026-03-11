import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { z } from "zod";

export const DbConfigSchema = z.object({
  DB_NAME: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_USER: z.string(),
  DB_PASS: z.string(),
  DB_SSL: z
    .enum(["true", "false"])
    .transform((value) => (value === "true" ? true : false)),
});

const parsed = DbConfigSchema.parse(process.env);

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle/migrations",
  schema: "./src/schema",
  dbCredentials: {
    database: parsed.DB_NAME,
    host: parsed.DB_HOST,
    port: parsed.DB_PORT,
    user: parsed.DB_USER,
    password: parsed.DB_PASS,
    ssl: parsed.DB_SSL,
  },
});
