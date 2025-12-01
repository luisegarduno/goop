#!/usr/bin/env bun

/**
 * Cleanup script to delete test sessions from the database
 *
 * Usage:
 *   bun run scripts/cleanup-test-sessions.ts
 *
 * This script deletes all sessions with titles that start with "[TEST]"
 * which are created by integration tests.
 */

import { db } from "../src/db/index";
import { sessions } from "../src/db/schema";
import { like } from "drizzle-orm";

async function cleanupTestSessions() {
  console.log("[Cleanup] Searching for test sessions...");

  // Find all sessions with titles starting with [TEST]
  const testSessions = await db.query.sessions.findMany({
    where: like(sessions.title, "[TEST]%"),
  });

  if (testSessions.length === 0) {
    console.log("[Cleanup] No test sessions found.");
    return;
  }

  console.log(`[Cleanup] Found ${testSessions.length} test sessions:`);
  testSessions.forEach((session) => {
    console.log(`  - ${session.title} (${session.id})`);
  });

  console.log("\n[Cleanup] Deleting test sessions...");

  // Delete all test sessions (cascade will delete messages and message parts)
  const result = await db
    .delete(sessions)
    .where(like(sessions.title, "[TEST]%"))
    .returning();

  console.log(`[Cleanup] Successfully deleted ${result.length} test sessions.`);
}

// Run cleanup
cleanupTestSessions()
  .then(() => {
    console.log("[Cleanup] Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[Cleanup] Error:", error);
    process.exit(1);
  });
