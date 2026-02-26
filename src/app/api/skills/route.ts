import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import {
  discoverSkills,
  getCatalog,
  installSkill,
  uninstallSkill,
  setSkillEnabled,
  checkSkillReadiness,
  getSkillEnvVarStatus,
} from "@/lib/skills-store";
import {
  setSkillCredential,
  deleteSkillCredential,
} from "@/lib/skill-credentials-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const view = url.searchParams.get("view");

  if (view === "catalog") {
    const catalog = await getCatalog();
    return NextResponse.json({ catalog });
  }

  if (view === "readiness") {
    const readiness = await checkSkillReadiness(userId);
    return NextResponse.json({ readiness });
  }

  if (view === "env") {
    const envVars = await getSkillEnvVarStatus(userId);
    return NextResponse.json({ envVars });
  }

  const skills = await discoverSkills();
  return NextResponse.json({ skills });
}

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    name?: string;
    enabled?: boolean;
    key?: string;
    value?: string;
  };

  // Set an encrypted skill credential in the DB
  if (body.action === "set_env") {
    if (typeof body.key !== "string" || !body.key.trim()) {
      return NextResponse.json({ error: "key (string) is required" }, { status: 400 });
    }
    if (typeof body.value !== "string" || !body.value.trim()) {
      return NextResponse.json({ error: "value (string) is required" }, { status: 400 });
    }
    await setSkillCredential(userId, body.key.trim(), body.value.trim());
    const envVars = await getSkillEnvVarStatus(userId);
    return NextResponse.json({ ok: true, envVars });
  }

  // Delete a skill credential from the DB
  if (body.action === "delete_env") {
    if (typeof body.key !== "string" || !body.key.trim()) {
      return NextResponse.json({ error: "key (string) is required" }, { status: 400 });
    }
    await deleteSkillCredential(userId, body.key.trim());
    const envVars = await getSkillEnvVarStatus(userId);
    return NextResponse.json({ ok: true, envVars });
  }

  if (typeof body.name !== "string") {
    return NextResponse.json({ error: "name (string) is required" }, { status: 400 });
  }

  // Install a skill from the curated catalog
  if (body.action === "install") {
    const result = await installSkill(body.name);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const [skills, catalog] = await Promise.all([discoverSkills(), getCatalog()]);
    return NextResponse.json({ ok: true, skills, catalog });
  }

  // Uninstall a skill
  if (body.action === "uninstall") {
    const result = await uninstallSkill(body.name);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const [skills, catalog] = await Promise.all([discoverSkills(), getCatalog()]);
    return NextResponse.json({ ok: true, skills, catalog });
  }

  // Toggle enabled/disabled
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) is required for toggle" }, { status: 400 });
  }

  await setSkillEnabled(body.name, body.enabled);
  const [skills, catalog] = await Promise.all([discoverSkills(), getCatalog()]);
  return NextResponse.json({ ok: true, skills, catalog });
}
