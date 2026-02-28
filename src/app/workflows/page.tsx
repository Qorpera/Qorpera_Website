import { WorkflowListPanel } from "@/components/workflow-list-panel";

export const metadata = { title: "Workflows — Qorpera" };

export default function WorkflowsPage() {
  return (
    <div className="p-6">
      <WorkflowListPanel />
    </div>
  );
}
