import type { Config } from "drizzle-kit";

// drizzle-kit runs outside Next, so load the env file ourselves (Node 21+).
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // no .env.local (e.g. CI with real env vars)
  }
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
