import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCompanySoul } from "@/lib/company-soul-store";
import { getCatalog, getSkillEnvVarStatus } from "@/lib/skills-store";
import { recommendSkills } from "@/lib/onboarding-skill-recommender";
import { OnboardingSkillSetup } from "@/components/onboarding-skill-setup";

export default async function OnboardingSkillsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [companySoul, catalog, envVarStatus] = await Promise.all([
    getCompanySoul(session.userId),
    getCatalog(),
    getSkillEnvVarStatus(session.userId),
  ]);

  const recommendations = recommendSkills(companySoul, catalog);

  return (
    <OnboardingSkillSetup
      recommendations={recommendations}
      catalog={catalog}
      initialEnvVars={envVarStatus}
    />
  );
}
