import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listDataApps } from "@/lib/data-app-store";
import { DataAppsListPanel } from "@/components/data-apps-list-panel";

export const dynamic = "force-dynamic";

export default async function DataAppsPage() {
  const session = await getSession();
  if (!session) return notFound();

  const apps = await listDataApps(session.userId);

  return <DataAppsListPanel initialApps={apps} />;
}
