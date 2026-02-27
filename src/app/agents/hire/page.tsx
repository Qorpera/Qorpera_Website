import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getActivePlanForUser } from "@/lib/plan-store";

export default async function AgentsHirePage() {
  const session = await getSession();
  if (!session) return redirect("/login");

  const plan = await getActivePlanForUser(session.userId);
  if (plan) {
    redirect("/agents");
  }
  redirect("/pricing");
}
