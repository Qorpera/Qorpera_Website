import { prisma } from "../src/lib/db";
import { getAppliedPatches } from "../src/lib/optimizer/optimizer-store";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "Jonas.Krug3r@gmail.com" },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const patches = await getAppliedPatches(user.id, "CHIEF_ADVISOR");
  if (!patches) {
    console.log("No patches active.");
    return;
  }

  console.log(`Active optimization patches injected into advisor:\n`);
  console.log("━".repeat(60));
  console.log(patches);
  console.log("━".repeat(60));
  console.log(`\nTotal patch length: ${patches.length} chars`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
