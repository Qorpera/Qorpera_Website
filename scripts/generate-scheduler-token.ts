/**
 * Generate a scheduler Bearer token for WF_SCHEDULER_TOKEN.
 *
 * Usage:
 *   npx tsx scripts/generate-scheduler-token.ts <userId>
 *
 * The userId can be found in your SQLite database (User.id) or
 * by checking the browser cookie. Prints the token to stdout.
 */

import { encodeSession } from "../src/lib/session-codec";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: npx tsx scripts/generate-scheduler-token.ts <userId>");
  process.exit(1);
}

const token = await encodeSession(userId);
console.log(`\nWF_SCHEDULER_TOKEN=${token}\n`);
console.log("Add the line above to your .env file, then restart the scheduler.");
