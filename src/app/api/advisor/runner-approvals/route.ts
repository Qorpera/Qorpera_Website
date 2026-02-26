import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { approveRunnerJob, cancelRunnerJob, listRunnersForUser } from "@/lib/runner-control-plane";
import { prisma } from "@/lib/db";
import { verifySameOrigin } from "@/lib/request-security";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [pendingJobs, runners] = await Promise.all([
    prisma.runnerJob.findMany({
      where: { userId: session.userId, status: "NEEDS_APPROVAL" },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        jobType: true,
        riskLevel: true,
        createdAt: true,
      },
    }),
    listRunnersForUser(session.userId),
  ]);

  const onlineRunnerCount = runners.filter((r) => r.status === "ONLINE").length;

  return NextResponse.json({
    jobs: pendingJobs.map((j) => ({
      id: j.id,
      title: j.title,
      jobType: j.jobType,
      riskLevel: j.riskLevel,
      createdAt: j.createdAt.toISOString(),
    })),
    onlineRunnerCount,
  });
}

export async function POST(req: NextRequest) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).action !== "string" ||
    typeof (body as Record<string, unknown>).jobId !== "string"
  ) {
    return NextResponse.json({ error: "action and jobId are required" }, { status: 400 });
  }

  const { action, jobId } = body as { action: string; jobId: string };

  try {
    if (action === "approve") {
      const job = await approveRunnerJob(session.userId, jobId);
      return NextResponse.json({ job });
    } else if (action === "cancel") {
      const job = await cancelRunnerJob(session.userId, jobId);
      return NextResponse.json({ job });
    } else {
      return NextResponse.json({ error: "action must be approve or cancel" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
