import { NextResponse } from "next/server";
import { executeDelegatedTask } from "@/lib/orchestration-store";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token || token !== process.env.WF_DAEMON_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { userId: string; taskId: string };

  if (!body.userId || !body.taskId) {
    return NextResponse.json({ error: "userId and taskId required" }, { status: 400 });
  }

  try {
    await executeDelegatedTask(body.userId, body.taskId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Execution failed" }, { status: 500 });
  }
}
