import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AutoApprovalPanel } from "@/components/auto-approval-panel";

export const metadata = { title: "Automations · Settings" };

export default async function AutomationsSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <AutoApprovalPanel />
    </div>
  );
}
