import { getSession } from "@/lib/auth";
import { RunnerControlPanel } from "@/components/runner-control-panel";

export default async function RunnersPage() {
  const session = await getSession();
  if (!session) return null;
  return <RunnerControlPanel />;
}
