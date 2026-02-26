import { getSession } from "@/lib/auth";
import { listExternalConnectors } from "@/lib/external-connector-store";
import { ConnectorsPanel } from "@/components/connectors-panel";

export default async function ConnectorsPage() {
  const session = await getSession();
  if (!session) return null;
  const connectors = await listExternalConnectors(session.userId);
  return <ConnectorsPanel initial={connectors} />;
}
