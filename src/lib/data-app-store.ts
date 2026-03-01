import { prisma } from "@/lib/db";
import type { DataAppView } from "@/lib/data-app-types";

function toView(row: {
  id: string;
  title: string;
  appType: string;
  dataJson: string;
  layoutJson: string;
  sourceContext: string;
  createdAt: Date;
  updatedAt: Date;
}): DataAppView {
  return {
    id: row.id,
    title: row.title,
    appType: row.appType,
    dataJson: row.dataJson,
    layoutJson: row.layoutJson,
    sourceContext: row.sourceContext,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listDataApps(userId: string): Promise<DataAppView[]> {
  const rows = await prisma.dataApp.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toView);
}

export async function getDataApp(userId: string, id: string): Promise<DataAppView | null> {
  const row = await prisma.dataApp.findFirst({
    where: { id, userId },
  });
  return row ? toView(row) : null;
}

export type CreateDataAppInput = {
  title: string;
  appType: string;
  dataJson: string;
  layoutJson?: string;
  sourceContext?: string;
};

export async function createDataApp(userId: string, input: CreateDataAppInput): Promise<DataAppView> {
  const row = await prisma.dataApp.create({
    data: {
      userId,
      title: input.title,
      appType: input.appType,
      dataJson: input.dataJson,
      layoutJson: input.layoutJson ?? "{}",
      sourceContext: input.sourceContext ?? "",
    },
  });
  return toView(row);
}

export async function deleteDataApp(userId: string, id: string): Promise<void> {
  const existing = await prisma.dataApp.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Data app not found");
  await prisma.dataApp.delete({ where: { id } });
}
