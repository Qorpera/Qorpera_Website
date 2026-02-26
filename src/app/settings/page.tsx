import { SettingsConsole } from "@/components/settings-console";
import { getAppPreferences } from "@/lib/settings-store";
import { getSession } from "@/lib/auth";
import { getCloudConnectors } from "@/lib/connectors-store";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;
  const [preferences, connector] = await Promise.all([
    getAppPreferences(session.userId),
    getCloudConnectors(session.userId),
  ]);
  return <SettingsConsole initial={preferences} connector={connector} />;
}
