/**
 * Test script: run one full optimizer cycle and print results.
 * Usage: npx tsx scripts/test-optimizer.ts
 */
import { prisma } from "../src/lib/db";
import { runOptimizationCycle } from "../src/lib/optimizer";
import { getLatestCycle } from "../src/lib/optimizer/optimizer-store";

async function main() {
  // Get the most recent real user (not test accounts)
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("Available users:");
  users.forEach((u, i) => console.log(`  [${i}] ${u.email} (${u.id})`));

  // Use the first non-test user, or fall back to the first user
  const user =
    users.find((u) => !u.email.includes("test.local")) ?? users[0];
  if (!user) {
    console.error("No users found in DB");
    process.exit(1);
  }
  console.log(`\nRunning optimizer cycle for: ${user.email}\n`);

  const start = Date.now();
  const result = await runOptimizationCycle(user.id, "CHIEF_ADVISOR");
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\n─── Cycle result (${elapsed}s) ───`);
  console.log(`cycleId: ${result.cycleId}`);
  console.log(`success: ${result.success}`);
  if (result.error) console.log(`error:   ${result.error}`);

  if (result.success) {
    const detail = await getLatestCycle(user.id, "CHIEF_ADVISOR");
    if (!detail) {
      console.log("No detail found (unexpected)");
      return;
    }

    console.log(`\nOverall score: ${detail.overallScore}/100`);
    console.log(`\nDimension scores:`);
    detail.dimensions.forEach((d) => {
      const bar = "█".repeat(Math.round(d.score / 10)) + "░".repeat(10 - Math.round(d.score / 10));
      console.log(`  ${d.label.padEnd(25)} ${bar} ${d.score}`);
    });

    console.log(`\nResearch findings: ${detail.research.length}`);
    detail.research.slice(0, 3).forEach((r) => {
      console.log(`  · [${r.topic}] ${r.technique}`);
      console.log(`    Source: ${r.source}`);
    });

    console.log(`\nImprovements generated: ${detail.improvements.length}`);
    detail.improvements.forEach((imp) => {
      console.log(`\n  [${"▲▲▲".slice(0, imp.priority === "high" ? 3 : imp.priority === "medium" ? 2 : 1)} ${imp.priority.toUpperCase()}] ${imp.dimension}`);
      console.log(`  Issue:  ${imp.issue}`);
      console.log(`  Fix:    ${imp.recommendation}`);
      console.log(`  Basis:  ${imp.researchBasis}`);
      console.log(`  Patch preview (first 200 chars):`);
      console.log(`    ${imp.promptPatch.slice(0, 200).replace(/\n/g, "\n    ")}`);
    });

    if (detail.synthesis) {
      console.log(`\nSynthesis (first 400 chars):\n${detail.synthesis.slice(0, 400)}...`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
