import * as schema from "./schema";

/*
 * Dual-driver database layer.
 * DATABASE_URL set  -> Neon / any Postgres over postgres-js.
 * DATABASE_URL unset -> embedded PGlite persisted to .data/pglite
 * (dev + demo mode; swap to Neon is one env var, no code change).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

export async function getDb() {
  if (_db) return _db;

  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(process.env.DATABASE_URL, { max: 5 });
    _db = drizzle(client, { schema });
  } else {
    const { drizzle } = await import("drizzle-orm/pglite");
    const { PGlite } = await import("@electric-sql/pglite");
    const { mkdirSync } = await import("fs");
    mkdirSync(".data/pglite", { recursive: true });
    const client = new PGlite(".data/pglite");
    _db = drizzle(client, { schema });
  }
  return _db;
}

export { schema };
