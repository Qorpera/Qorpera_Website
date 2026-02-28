import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listExternalConnectors } from "@/lib/external-connector-store";
import { listConnections } from "@/lib/integrations/token-store";
import { ConnectorsPanel } from "@/components/connectors-panel";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { Suspense } from "react";

export const metadata = { title: "Connections · Settings" };

export default async function ConnectionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [connectors, integrations] = await Promise.all([
    listExternalConnectors(session.userId),
    listConnections(session.userId).catch(() => []),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <ConnectorsPanel initial={connectors} />
      <div className="border-t border-[rgba(255,255,255,0.06)] pt-8">
        <Suspense>
          <IntegrationsPanel initialConnections={integrations} />
        </Suspense>
      </div>
    </div>
  );
}
