import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listBusinessFiles } from "@/lib/business-files-store";
import { checkExpectedFiles } from "@/lib/expected-business-files";
import { OnboardingFileUpload } from "@/components/onboarding-file-upload";

export default async function OnboardingFilesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const files = await listBusinessFiles(session.userId, 200);
  const statuses = checkExpectedFiles(
    files.map((f) => ({ id: f.id, name: f.name, category: f.category })),
  );

  return <OnboardingFileUpload initialStatuses={statuses} />;
}
