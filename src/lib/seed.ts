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
    where: { kind: "RESEARCH_ANALYST" },
    update: { name: "Nova", username: "nova", headline: "Searches, validates, and reports." },
    create: {
      kind: "RESEARCH_ANALYST",
      name: "Nova",
      username: "nova",
      headline: "Searches, validates, and reports.",
    },
  });

}
