import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../src/db/schema";
import { resolve } from "path";
import { readdir, readFile } from "fs/promises";

// Store multiple database instances (one per test suite)
const testDbs: PGlite[] = [];

/**
 * Initialize a fresh in-memory test database with migrations
 */
export async function setupTestDatabase() {
  // Create in-memory PGlite instance
  const newDb = new PGlite();
  testDbs.push(newDb);

  const db = drizzle(newDb, { schema });

  // Manually run migrations due to PGlite limitations with multi-statement files
  const migrationsDir = resolve(__dirname, "../src/db/migrations");
  const files = await readdir(migrationsDir);
  const sqlFiles = files
    .filter((f) => f.endsWith(".sql"))
    .sort(); // Ensure migrations run in order

  for (const file of sqlFiles) {
    const filePath = resolve(migrationsDir, file);
    const sql = await readFile(filePath, "utf-8");

    // Drizzle uses "--> statement-breakpoint" as delimiter
    // Split by this delimiter first, then handle semicolons
    const blocks = sql.split("--> statement-breakpoint");

    for (const block of blocks) {
      // Each block may contain one or more SQL statements separated by semicolons
      const statements = block
        .split(";")
        .map((s) => {
          // Remove SQL comments (lines starting with --)
          const lines = s.split("\n").filter((line) => !line.trim().startsWith("--"));
          return lines.join("\n").trim();
        })
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        if (statement) {
          await newDb.exec(statement);
        }
      }
    }
  }

  return { db, client: newDb };
}

/**
 * Clean up test database
 */
export async function teardownTestDatabase() {
  // Close all database instances
  for (const db of testDbs) {
    try {
      await db.close();
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
  testDbs.length = 0; // Clear the array
}

/**
 * Clear all data from database tables (for test isolation)
 */
export async function clearDatabase(db: any) {
  await db.delete(schema.messageParts);
  await db.delete(schema.messages);
  await db.delete(schema.sessions);
}

/**
 * Helper to create a test session
 */
export async function createTestSession(db: any, overrides: any = {}) {
  const [session] = await db
    .insert(schema.sessions)
    .values({
      title: "Test Session",
      workingDirectory: "/tmp",
      provider: "anthropic",
      model: "claude-3-5-haiku-latest",
      ...overrides,
    })
    .returning();
  return session;
}
