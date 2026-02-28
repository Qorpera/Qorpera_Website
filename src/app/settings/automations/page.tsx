import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AutoApprovalPanel } from "@/components/auto-approval-panel";
import { OutputRoutesPanel } from "@/components/output-routes-panel";
import { AutoApprovalsPanel } from "@/components/auto-approvals-panel";

export const metadata = { title: "Automations · Settings" };

export default async function AutomationsSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <AutoApprovalPanel />
      <div className="border-t border-[rgba(255,255,255,0.06)] pt-8">
        <OutputRoutesPanel />
      </div>
      <div className="border-t border-[rgba(255,255,255,0.06)] pt-8">
        <h2 className="text-lg font-semibold tracking-tight mb-4">Runner Policies</h2>
        <AutoApprovalsPanel />
      </div>
    </div>
  );
}
