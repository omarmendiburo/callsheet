/*
 * Programmatic migration runner, driver-aware.
 * Called by scripts/seed.ts and `pnpm db:migrate` — works against PGlite
 * (offline demo mode) and Neon/Postgres (DATABASE_URL) identically.
 */

export async function runMigrations() {
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const postgres = (await import("postgres")).default;
    const client = postgres(process.env.DATABASE_URL, { max: 1 });
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "./drizzle" });
    await client.end();
  } else {
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const { PGlite } = await import("@electric-sql/pglite");
    const { mkdirSync } = await import("fs");
    mkdirSync(".data/pglite", { recursive: true });
    const client = new PGlite(".data/pglite");
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "./drizzle" });
    await client.close();
  }
  console.log("migrations applied");
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  runMigrations().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
