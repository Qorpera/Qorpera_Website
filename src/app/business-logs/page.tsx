import { getSession } from "@/lib/auth";
import { listBusinessLogs } from "@/lib/business-logs-store";
import { listBusinessFiles } from "@/lib/business-files-store";
import { checkExpectedFiles } from "@/lib/expected-business-files";
import { BusinessLogsPanel } from "@/components/business-logs-panel";

export default async function BusinessLogsPage() {
  const session = await getSession();
  if (!session) return null;
  const [logs, files] = await Promise.all([
    listBusinessLogs(session.userId, 60),
    listBusinessFiles(session.userId, 200),
  ]);
  const expectedFileStatuses = checkExpectedFiles(
    files.map((f) => ({ id: f.id, name: f.name, category: f.category })),
  );
  return (
    <BusinessLogsPanel
      initial={logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))}
      initialFiles={files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString(), updatedAt: f.updatedAt.toISOString() }))}
      expectedFileStatuses={expectedFileStatuses}
    />
  );
}
