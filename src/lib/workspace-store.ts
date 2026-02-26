import { ProjectHealth, ProjectTaskColumn, RunStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PROJECTS, TEMPLATE_GALLERY, type ProjectBoardColumn } from "@/lib/workforce-ui";
import { getAppPreferences } from "@/lib/settings-store";
import { getCloudConnectors } from "@/lib/connectors-store";
import { companySoulForAdvisor, getCompanySoul } from "@/lib/company-soul-store";
import { getAgentSoulPackForUser } from "@/lib/agent-soul";

export type DbUiProject = {
  id: string;
  slug: string;
  name: string;
  goal: string;
  status: string;
  workforceHealth: "green" | "yellow" | "red";
  board: ProjectBoardColumn[];
  artifacts: string[];
  timeline: string[];
};

export type DbTemplate = {
  id: string;
  slug: string;
  name: string;
  outcome: string;
  workflow: string;
  permissions: string;
  agents: string[];
};

export type DbRun = {
  id: string;
  name: string;
  project: string;
  eta: string;
  status: string;
};

export type ProjectRunContextSummary = {
  latest: {
    runId: string;
    runName: string;
    createdAt: string;
    soulSnapshotVersion: string | null;
    companySoulCompleteness: number | null;
    autonomy: string | null;
    connectors: Array<{ provider: string; mode: string; status: string }>;
    agents: Array<{ kind: string; role: string; anchorCount: number; memoryCount: number }>;
  } | null;
  previous: {
    runId: string;
    runName: string;
    createdAt: string;
    companySoulCompleteness: number | null;
    autonomy: string | null;
    connectors: Array<{ provider: string; mode: string; status: string }>;
    agents: Array<{ kind: string; role: string; anchorCount: number; memoryCount: number }>;
  } | null;
  diffLines: string[];
};

type RunSoulSnapshot = {
  version: "run-soul-v1";
  createdAt: string;
  project: { id: string | null; slug: string | null; name: string | null };
  companySoul: ReturnType<typeof companySoulForAdvisor>;
  agentSoulPacks: Array<{
    kind: string;
    agentName: string;
    role: string;
    companyName: string | null;
    coreTruths: string[];
    boundaries: string[];
    roleIdentity: string[];
    companyAnchors: string[];
    operatingMemory: string[];
  }>;
  preferences: Awaited<ReturnType<typeof getAppPreferences>>;
  connectors: Array<{
    provider: string;
    mode: string;
    status: string;
    managedAvailable: boolean;
    monthlyRequestLimit: number;
    monthlyRequestCount: number;
    monthlyUsdLimit: number;
    monthlyEstimatedUsd: number;
  }>;
};

function parseRunSoulSnapshot(json: string | null): RunSoulSnapshot | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as RunSoulSnapshot;
  } catch {
    return null;
  }
}

function summarizeRunForContext(run: {
  id: string;
  name: string;
  createdAt: Date;
  soulSnapshotVersion: string | null;
  soulSnapshotJson: string | null;
}) {
  const snap = parseRunSoulSnapshot(run.soulSnapshotJson);
  return {
    runId: run.id,
    runName: run.name,
    createdAt: run.createdAt.toISOString(),
    soulSnapshotVersion: run.soulSnapshotVersion,
    companySoulCompleteness: snap?.companySoul?.completenessScore ?? null,
    autonomy: snap?.preferences?.defaultAutonomy ?? null,
    connectors:
      snap?.connectors?.map((c) => ({ provider: c.provider, mode: c.mode, status: c.status })) ?? [],
    agents:
      snap?.agentSoulPacks?.map((a) => ({
        kind: a.kind,
        role: a.role,
        anchorCount: a.companyAnchors.length,
        memoryCount: a.operatingMemory.length,
      })) ?? [],
  };
}

function diffRunContext(
  latest: ReturnType<typeof summarizeRunForContext> | null,
  previous: ReturnType<typeof summarizeRunForContext> | null,
) {
  if (!latest) return ["No run context snapshots recorded yet."];
  if (!previous) {
    return [
      `First recorded run context snapshot (${latest.soulSnapshotVersion ?? "unknown version"}).`,
      latest.companySoulCompleteness != null
        ? `Company Soul completeness at run time: ${latest.companySoulCompleteness}%.`
        : "Company Soul completeness unavailable in this snapshot.",
    ];
  }

  const lines: string[] = [];
  if (latest.companySoulCompleteness !== previous.companySoulCompleteness) {
    lines.push(
      `Company Soul completeness changed from ${previous.companySoulCompleteness ?? "?"}% to ${latest.companySoulCompleteness ?? "?"}%.`,
    );
  }
  if (latest.autonomy !== previous.autonomy) {
    lines.push(`Default autonomy changed from ${previous.autonomy ?? "unknown"} to ${latest.autonomy ?? "unknown"}.`);
  }

  const connectorMap = new Map(previous.connectors.map((c) => [c.provider, c]));
  for (const c of latest.connectors) {
    const prev = connectorMap.get(c.provider);
    if (!prev) {
      lines.push(`${c.provider} connector added (${c.mode.toLowerCase()}, ${c.status.toLowerCase()}).`);
      continue;
    }
    if (prev.mode !== c.mode || prev.status !== c.status) {
      lines.push(
        `${c.provider} connector changed from ${prev.mode.toLowerCase()}/${prev.status.toLowerCase()} to ${c.mode.toLowerCase()}/${c.status.toLowerCase()}.`,
      );
    }
  }

  const prevAgents = new Map(previous.agents.map((a) => [a.kind, a]));
  for (const agent of latest.agents) {
    const prev = prevAgents.get(agent.kind);
    if (!prev) {
      lines.push(`${agent.role} soul pack added to run context.`);
      continue;
    }
    if (prev.anchorCount !== agent.anchorCount) {
      lines.push(`${agent.role} company anchors changed (${prev.anchorCount} -> ${agent.anchorCount}).`);
    }
    if (prev.memoryCount !== agent.memoryCount) {
      lines.push(`${agent.role} operating memory depth changed (${prev.memoryCount} -> ${agent.memoryCount}).`);
    }
  }

  if (!lines.length) lines.push("No major run-context changes detected vs the previous run snapshot.");
  return lines.slice(0, 8);
}

function slugify(input: string) {
  return input.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-+|-+$/g, "");
}

function toProjectHealth(h: "green" | "yellow" | "red"): ProjectHealth {
  return h === "green" ? ProjectHealth.GREEN : h === "yellow" ? ProjectHealth.YELLOW : ProjectHealth.RED;
}

function fromProjectHealth(h: ProjectHealth): "green" | "yellow" | "red" {
  return h === ProjectHealth.GREEN ? "green" : h === ProjectHealth.YELLOW ? "yellow" : "red";
}

function toTaskColumn(title: string): ProjectTaskColumn {
  if (title === "To Do") return ProjectTaskColumn.TODO;
  if (title === "In Progress") return ProjectTaskColumn.IN_PROGRESS;
  if (title === "Review") return ProjectTaskColumn.REVIEW;
  return ProjectTaskColumn.DONE;
}

function fromTaskColumn(column: ProjectTaskColumn): string {
  if (column === ProjectTaskColumn.TODO) return "To Do";
  if (column === ProjectTaskColumn.IN_PROGRESS) return "In Progress";
  if (column === ProjectTaskColumn.REVIEW) return "Review";
  return "Done";
}

function inferRunStatus(status: string): RunStatus {
  if (status.toLowerCase().includes("block")) return RunStatus.BLOCKED;
  if (status.toLowerCase().includes("draft")) return RunStatus.DRAFTING;
  if (status.toLowerCase().includes("finish")) return RunStatus.FINISHED;
  return RunStatus.RUNNING;
}

export async function ensureWorkspaceSeeded(userId: string) {
  await ensureTemplatesSeeded();
  await ensureProjectsSeeded(userId);
  await ensureRunsSeeded(userId);
}

async function ensureTemplatesSeeded() {
  const count = await prisma.template.count();
  if (count > 0) return;

  for (const template of TEMPLATE_GALLERY) {
    const created = await prisma.template.create({
      data: {
        slug: slugify(template.name),
        name: template.name,
        outcome: template.outcome,
        workflow: template.workflow,
        permissions: template.permissions,
      },
    });

    await prisma.templateAgentRole.createMany({
      data: template.agents.map((role, idx) => ({
        templateId: created.id,
        role,
        sortOrder: idx,
      })),
    });
  }
}

async function ensureProjectsSeeded(userId: string) {
  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) return;

  const count = await prisma.project.count({ where: { userId } });
  if (count > 0) return;

  for (const project of PROJECTS) {
    const created = await prisma.project.create({
      data: {
        userId,
        slug: project.id,
        name: project.name,
        goal: project.goal,
        status: project.status,
        workforceHealth: toProjectHealth(project.workforceHealth),
      },
    });

    for (const column of project.board) {
      await prisma.projectTask.createMany({
        data: column.cards.map((card, idx) => ({
          projectId: created.id,
          externalId: card.id,
          title: card.title,
          owner: card.owner,
          etaLabel: card.eta,
          column: toTaskColumn(column.title),
          sortOrder: idx,
        })),
      });
    }

    await prisma.projectArtifact.createMany({
      data: project.artifacts.map((name) => ({ projectId: created.id, name })),
    });

    await prisma.auditLog.createMany({
      data: project.timeline.map((line) => ({
        userId,
        scope: "PROJECT",
        entityId: created.id,
        action: "TIMELINE_SEED",
        summary: line,
      })),
    });
  }
}

async function ensureRunsSeeded(userId: string) {
  const count = await prisma.run.count({ where: { userId } });
  if (count > 0) return;

  const projects = await prisma.project.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const byName = new Map(projects.map((p) => [p.name, p]));
  const seedRuns = [
    { name: "Support triage batch", project: "Customer Support Triage", eta: "18 min", status: "Running" },
    { name: "Weekly KPI summary", project: "Weekly KPI Report", eta: "9 min", status: "Drafting" },
    { name: "Prospect enrichment retry", project: "Outbound Sales Research", eta: "Needs retry", status: "Blocked" },
  ];

  await prisma.run.createMany({
    data: seedRuns.map((run) => ({
      userId,
      projectId: byName.get(run.project)?.id,
      name: run.name,
      etaLabel: run.eta,
      status: inferRunStatus(run.status),
    })),
  });
}

export async function getTemplates(): Promise<DbTemplate[]> {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "asc" },
    include: { roles: { orderBy: { sortOrder: "asc" } } },
  });

  return templates.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    outcome: t.outcome,
    workflow: t.workflow,
    permissions: t.permissions,
    agents: t.roles.map((r) => r.role),
  }));
}

export async function getProjectsForUser(userId: string): Promise<DbUiProject[]> {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      tasks: { orderBy: [{ column: "asc" }, { sortOrder: "asc" }] },
      artifacts: { orderBy: { createdAt: "asc" } },
    },
  });

  const audit = await prisma.auditLog.findMany({
    where: { userId, scope: "PROJECT", entityId: { in: projects.map((p) => p.id) } },
    orderBy: { createdAt: "desc" },
  });
  const auditByProject = new Map<string, typeof audit>();
  for (const entry of audit) {
    const curr = auditByProject.get(entry.entityId) ?? [];
    curr.push(entry);
    auditByProject.set(entry.entityId, curr);
  }

  return projects.map((project) => {
    const columnsOrdered: ProjectTaskColumn[] = [
      ProjectTaskColumn.TODO,
      ProjectTaskColumn.IN_PROGRESS,
      ProjectTaskColumn.REVIEW,
      ProjectTaskColumn.DONE,
    ];
    const board: ProjectBoardColumn[] = columnsOrdered.map((column) => ({
      title: fromTaskColumn(column),
      cards: project.tasks
        .filter((t) => t.column === column)
        .map((t) => ({ id: t.externalId ?? t.id, title: t.title, owner: t.owner, eta: t.etaLabel })),
    }));

    return {
      id: project.id,
      slug: project.slug,
      name: project.name,
      goal: project.goal,
      status: project.status,
      workforceHealth: fromProjectHealth(project.workforceHealth),
      board,
      artifacts: project.artifacts.map((a) => a.name),
      timeline: (auditByProject.get(project.id) ?? []).slice(0, 8).map((a) => a.summary),
    };
  });
}

export async function getProjectForUser(userId: string, idOrSlug: string): Promise<DbUiProject | null> {
  const projects = await getProjectsForUser(userId);
  return projects.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null;
}

export async function getRunsForUser(userId: string): Promise<DbRun[]> {
  const runs = await prisma.run.findMany({
    where: { userId, status: { in: [RunStatus.RUNNING, RunStatus.DRAFTING, RunStatus.BLOCKED] } },
    include: { project: true },
    orderBy: { createdAt: "desc" },
    take: 7,
  });

  return runs.map((r) => ({
    id: r.id,
    name: r.name,
    project: r.project?.name ?? "Unassigned",
    eta: r.etaLabel,
    status:
      r.status === RunStatus.RUNNING ? "Running" : r.status === RunStatus.DRAFTING ? "Drafting" : r.status === RunStatus.BLOCKED ? "Blocked" : "Finished",
  }));
}

export async function createRunForProject(userId: string, projectId?: string, name?: string) {
  const project = projectId ? await prisma.project.findFirst({ where: { id: projectId, userId } }) : null;
  const [companySoul, prefs, connectors, assistantSoul, managerSoul] = await Promise.all([
    getCompanySoul(userId),
    getAppPreferences(userId),
    getCloudConnectors(userId),
    getAgentSoulPackForUser(userId, "ASSISTANT"),
    getAgentSoulPackForUser(userId, "PROJECT_MANAGER"),
  ]);

  const soulSnapshot: RunSoulSnapshot = {
    version: "run-soul-v1",
    createdAt: new Date().toISOString(),
    project: {
      id: project?.id ?? null,
      slug: project?.slug ?? null,
      name: project?.name ?? null,
    },
    companySoul: companySoulForAdvisor(companySoul),
    agentSoulPacks: [assistantSoul, managerSoul]
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        kind: p.kind,
        agentName: p.agentName,
        role: p.role,
        companyName: p.companyName,
        coreTruths: p.coreTruths,
        boundaries: p.boundaries,
        roleIdentity: p.roleIdentity,
        companyAnchors: p.companyAnchors,
        operatingMemory: p.operatingMemory,
      })),
    preferences: prefs,
    connectors: connectors.map((c) => ({
      provider: c.provider,
      mode: c.mode,
      status: c.status,
      managedAvailable: c.managedAvailable,
      monthlyRequestLimit: c.monthlyRequestLimit,
      monthlyRequestCount: c.monthlyRequestCount,
      monthlyUsdLimit: c.monthlyUsdLimit,
      monthlyEstimatedUsd: c.monthlyEstimatedUsd,
    })),
  };

  const run = await prisma.run.create({
    data: {
      userId,
      projectId: project?.id,
      name: name ?? (project ? `${project.name} run` : "Ad hoc run"),
      status: RunStatus.RUNNING,
      etaLabel: "Starting...",
      soulSnapshotVersion: soulSnapshot.version,
      soulSnapshotJson: JSON.stringify(soulSnapshot),
    },
  });

  if (project) {
    await prisma.auditLog.create({
      data: {
        userId,
        scope: "PROJECT",
        entityId: project.id,
        action: "RUN_STARTED",
        summary: `Run started: ${run.name} (soul snapshot ${soulSnapshot.version})`,
        metadata: JSON.stringify({
          runId: run.id,
          soulSnapshotVersion: soulSnapshot.version,
          companySoulCompleteness: soulSnapshot.companySoul.completenessScore,
          agentsInSnapshot: soulSnapshot.agentSoulPacks.map((a) => a.role),
        }),
      },
    });
  }

  return run;
}

export async function getRunSoulSnapshot(userId: string, runId: string) {
  const run = await prisma.run.findFirst({
    where: { id: runId, userId },
    select: {
      id: true,
      name: true,
      soulSnapshotVersion: true,
      soulSnapshotJson: true,
      createdAt: true,
      project: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!run) return null;

  let snapshot: RunSoulSnapshot | null = null;
  if (run.soulSnapshotJson) {
    try {
      snapshot = JSON.parse(run.soulSnapshotJson) as RunSoulSnapshot;
    } catch {
      snapshot = null;
    }
  }

  return {
    runId: run.id,
    runName: run.name,
    createdAt: run.createdAt.toISOString(),
    project: run.project,
    soulSnapshotVersion: run.soulSnapshotVersion,
    snapshot,
  };
}

export async function getProjectRunContextSummary(userId: string, projectId: string): Promise<ProjectRunContextSummary> {
  const runs = await prisma.run.findMany({
    where: { userId, projectId },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      name: true,
      createdAt: true,
      soulSnapshotVersion: true,
      soulSnapshotJson: true,
    },
  });

  const latest = runs[0] ? summarizeRunForContext(runs[0]) : null;
  const previous = runs[1] ? summarizeRunForContext(runs[1]) : null;

  return {
    latest,
    previous,
    diffLines: diffRunContext(latest, previous),
  };
}

export async function getProjectActivityExport(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) return null;

  const entries = await prisma.auditLog.findMany({
    where: { userId, scope: "PROJECT", entityId: projectId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return {
    project,
    entries,
  };
}

export async function createProjectFromTemplate(userId: string, templateSlug: string) {
  await ensureWorkspaceSeeded(userId);
  const template = await prisma.template.findUnique({
    where: { slug: templateSlug },
    include: { roles: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return null;

  const baseSlug = slugify(template.name);
  let slug = baseSlug;
  let suffix = 2;
  while (await prisma.project.findFirst({ where: { userId, slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const matchedMock = PROJECTS.find((p) =>
    p.name.toLowerCase().includes(template.name.split(" ")[0].toLowerCase()),
  );

  const project = await prisma.project.create({
    data: {
      userId,
      slug,
      name: template.name,
      goal: matchedMock?.goal ?? template.outcome,
      status: "Active",
      workforceHealth: matchedMock ? toProjectHealth(matchedMock.workforceHealth) : ProjectHealth.GREEN,
    },
  });

  const defaultBoard = matchedMock?.board ?? [
    { title: "To Do", cards: [{ id: "seed-1", title: "Review template setup", owner: "You", eta: "Now" }] },
    { title: "In Progress", cards: [{ id: "seed-2", title: "Connect first tool", owner: "Ops", eta: "Today" }] },
    { title: "Review", cards: [{ id: "seed-3", title: "Approve first run settings", owner: "You", eta: "Today" }] },
    { title: "Done", cards: [] },
  ];

  for (const column of defaultBoard) {
    if (column.cards.length === 0) continue;
    await prisma.projectTask.createMany({
      data: column.cards.map((card, idx) => ({
        projectId: project.id,
        externalId: card.id,
        title: card.title,
        owner: card.owner,
        etaLabel: card.eta,
        column: toTaskColumn(column.title),
        sortOrder: idx,
      })),
    });
  }

  const artifacts =
    matchedMock?.artifacts ?? [`${template.name} brief`, `${template.name} workflow`, `${template.name} approvals checklist`];
  await prisma.projectArtifact.createMany({ data: artifacts.map((name) => ({ projectId: project.id, name })) });

  await prisma.auditLog.createMany({
    data: [
      {
        userId,
        scope: "PROJECT",
        entityId: project.id,
        action: "PROJECT_CREATED",
        summary: `Project created from template: ${template.name}`,
      },
      {
        userId,
        scope: "PROJECT",
        entityId: project.id,
        action: "WORKFLOW_APPLIED",
        summary: `Workflow applied: ${template.workflow}`,
      },
      {
        userId,
        scope: "PROJECT",
        entityId: project.id,
        action: "PERMISSIONS_APPLIED",
        summary: `Permissions applied: ${template.permissions}`,
      },
    ],
  });

  await createRunForProject(userId, project.id, `${project.name} setup run`);

  return project;
}
