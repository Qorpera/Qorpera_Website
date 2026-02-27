import { getSession } from "@/lib/auth";
import { listConnections } from "@/lib/integrations/token-store";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { Suspense } from "react";

export default async function IntegrationsPage() {
  const session = await getSession();
  if (!session) return null;

  const initialConnections = await listConnections(session.userId).catch(() => []);

  return (
    <div className="px-4 py-8">
      <Suspense>
        <IntegrationsPanel initialConnections={initialConnections} />
      </Suspense>
    </div>
  );
}
