import { getSession } from "@/lib/auth";
import { getCompanySoul } from "@/lib/company-soul-store";
import { CompanySoulForm } from "@/components/company-soul-form";

export default async function CompanySoulPage() {
  const session = await getSession();
  if (!session) return null;
  const companySoul = await getCompanySoul(session.userId);
  return <CompanySoulForm initial={companySoul} />;
}

