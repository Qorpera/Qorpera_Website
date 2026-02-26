import { prisma } from "@/lib/db";

export async function ensureBaseAgents() {
  await prisma.agent.upsert({
    where: { kind: "ASSISTANT" },
    update: { name: "Assistant", username: "mara", headline: "Keeps things moving." },
    create: {
      kind: "ASSISTANT",
      name: "Assistant",
      username: "mara",
      headline: "Keeps things moving.",
    },
  });

  await prisma.agent.upsert({
    where: { kind: "PROJECT_MANAGER" },
    update: { name: "Project Manager", username: "ilan", headline: "Plans, tracks, ships." },
    create: {
      kind: "PROJECT_MANAGER",
      name: "Project Manager",
      username: "ilan",
      headline: "Plans, tracks, ships.",
    },
  });
}
