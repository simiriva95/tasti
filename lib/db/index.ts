import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Construct lazily-safe: neon() only errors on an actual query, so a missing
// DATABASE_URL won't break the build — just runtime DB calls when unconfigured.
const sql = neon(
  process.env.DATABASE_URL ?? "postgresql://user:pass@localhost.tld/db"
);
export const db = drizzle(sql, { schema });

