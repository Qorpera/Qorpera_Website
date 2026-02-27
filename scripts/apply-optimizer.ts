import { prisma } from "../src/lib/db";
import { getLatestCycle, applyImprovement } from "../src/lib/optimizer/optimizer-store";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "Jonas.Krug3r@gmail.com" },
    select: { id: true, email: true },
  });
  if (!user) throw new Error("User not found");

  const cycle = await getLatestCycle(user.id, "CHIEF_ADVISOR");
  if (!cycle) throw new Error("No completed cycle found");

  console.log(`Cycle: ${cycle.id} (score: ${cycle.overallScore})`);
  console.log(`Improvements: ${cycle.improvements.length}`);
  console.log(`Already applied: ${cycle.appliedImprovementIds.size}\n`);

  for (const imp of cycle.improvements) {
    if (cycle.appliedImprovementIds.has(imp.id)) {
      console.log(`  [skip] ${imp.id} — already applied`);
      continue;
    }
    await applyImprovement(user.id, cycle.id, "CHIEF_ADVISOR", imp);
    console.log(`  [✓] Applied: ${imp.dimension} (${imp.priority})`);
    console.log(`      ${imp.issue.slice(0, 90)}...`);
  }

  console.log("\nAll improvements applied. Advisor will use these patches from next conversation.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
