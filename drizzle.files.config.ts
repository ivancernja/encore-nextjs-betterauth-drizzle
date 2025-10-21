import type { Config } from "drizzle-kit";

export default {
  out: "./files/migrations",
  schema: "./files/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.FILES_DATABASE_URL!,
  },
} satisfies Config;
