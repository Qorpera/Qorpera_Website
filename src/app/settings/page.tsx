import { SettingsConsole } from "@/components/settings-console";
import { getAppPreferences } from "@/lib/settings-store";
import { getSession } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;
  const preferences = await getAppPreferences(session.userId);
  return <SettingsConsole initial={preferences} />;
}
