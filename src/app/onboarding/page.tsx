import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCompanySoul } from "@/lib/company-soul-store";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const companySoul = await getCompanySoul(session.userId);

  return <OnboardingWizard initial={companySoul} />;
}
