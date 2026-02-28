import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OptimizerPanel } from "@/components/optimizer-panel";

export const dynamic = "force-dynamic";

export default async function OptimizerPage() {
  const session = await getSession();
  if (!session) return notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prompt Optimizer</h1>
        <p className="mt-1 text-sm wf-muted">
          Analyze feedback patterns and run A/B tests to improve agent performance.
        </p>
      </div>
      <OptimizerPanel />
    </div>
  );
}
