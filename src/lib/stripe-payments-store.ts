import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { createHiredJobIfMissing } from "@/lib/agent-hiring";

type StripeCheckoutSessionLike = {
  id: string;
  payment_intent?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_status?: string | null;
  mode?: string | null;
  created?: number | null;
  subscription?: string | null;
  metadata?: Record<string, string> | null;
};

type RecordPaymentInput = {
  stripeEventId?: string | null;
  session: StripeCheckoutSessionLike;
};

function cleanCurrency(input?: string | null) {
  return (input || "usd").trim().toLowerCase().slice(0, 12) || "usd";
}

function centsToMoney(cents: number, currency = "usd") {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function bytesFromText(text: string) {
  return new TextEncoder().encode(text);
}

function csvEscape(value: string | number | null | undefined) {
  const s = value == null ? "" : String(value);
  if (!/[",\n]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

async function upsertSystemBusinessFile(input: {
  userId: string;
  fileName: string;
  body: string;
  mimeType: string;
  relatedRef: string;
}) {
  const folder = path.join(process.cwd(), ".data", "business-files", input.userId, "system");
  await mkdir(folder, { recursive: true });
  const absPath = path.join(folder, input.fileName);
  const bytes = bytesFromText(input.body);
  await writeFile(absPath, bytes);

  const existing = await prisma.businessFile.findFirst({
    where: { userId: input.userId, relatedRef: input.relatedRef },
    orderBy: { updatedAt: "desc" },
  });

  const textExtract = input.body.slice(0, 20000);
  if (existing) {
    return prisma.businessFile.update({
      where: { id: existing.id },
      data: {
        name: input.fileName,
        category: "FINANCIAL",
        mimeType: input.mimeType,
        sizeBytes: bytes.byteLength,
        storagePath: absPath,
        textExtract,
        source: "IMPORT",
        authorLabel: "Stripe System",
      },
    });
  }

  return prisma.businessFile.create({
    data: {
      userId: input.userId,
      name: input.fileName,
      category: "FINANCIAL",
      mimeType: input.mimeType,
      sizeBytes: bytes.byteLength,
      storagePath: absPath,
      textExtract,
      source: "IMPORT",
      authorLabel: "Stripe System",
      relatedRef: input.relatedRef,
    },
  });
}

async function upsertFinanceArtifacts(userId: string) {
  const payments = await prisma.stripePayment.findMany({
    where: { userId },
    orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
  });

  const header = [
    "paid_at",
    "checkout_session_id",
    "payment_intent_id",
    "agent_kind",
    "schedule",
    "amount_total_cents",
    "currency",
    "payment_status",
    "mode",
  ];

  const csvLines = [
    header.join(","),
    ...payments.map((p) =>
      [
        p.paidAt?.toISOString() ?? "",
        p.checkoutSessionId,
        p.paymentIntentId ?? "",
        p.agentKind ?? "",
        p.schedule ?? "",
        p.amountTotal,
        p.currency,
        p.paymentStatus,
        p.mode,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];

  const paid = payments.filter((p) => p.paymentStatus === "paid");
  const totalCents = paid.reduce((sum, p) => sum + p.amountTotal, 0);
  const byAgent = new Map<string, { count: number; cents: number }>();
  const byMonth = new Map<string, { count: number; cents: number }>();

  for (const p of paid) {
    const agent = p.agentKind || "UNKNOWN";
    const agentRow = byAgent.get(agent) ?? { count: 0, cents: 0 };
    agentRow.count += 1;
    agentRow.cents += p.amountTotal;
    byAgent.set(agent, agentRow);

    const month = (p.paidAt ?? p.createdAt).toISOString().slice(0, 7);
    const monthRow = byMonth.get(month) ?? { count: 0, cents: 0 };
    monthRow.count += 1;
    monthRow.cents += p.amountTotal;
    byMonth.set(month, monthRow);
  }

  const recentPaymentLines = payments.slice(-8).reverse().map((p) => {
    const ts = (p.paidAt ?? p.createdAt).toISOString();
    return `- ${ts} | ${p.agentKind ?? "UNKNOWN"} | ${p.schedule ?? "-"} | ${centsToMoney(p.amountTotal, p.currency)} | ${p.paymentStatus}`;
  });

  const analysisLines = [
    "Stripe Financial Analysis",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Total recorded Stripe checkouts: ${payments.length}`,
    `Paid checkouts: ${paid.length}`,
    `Gross Stripe revenue: ${centsToMoney(totalCents, paid[0]?.currency ?? "usd")}`,
    "",
    "Revenue by agent type:",
    ...(byAgent.size
      ? [...byAgent.entries()]
          .sort((a, b) => b[1].cents - a[1].cents)
          .map(([agent, stats]) => `- ${agent}: ${stats.count} payments, ${centsToMoney(stats.cents, paid[0]?.currency ?? "usd")}`)
      : ["- No paid Stripe transactions yet."]),
    "",
    "Monthly totals:",
    ...(byMonth.size
      ? [...byMonth.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, stats]) => `- ${month}: ${stats.count} payments, ${centsToMoney(stats.cents, paid[0]?.currency ?? "usd")}`)
      : ["- No paid Stripe transactions yet."]),
    "",
    "Recent payments:",
    ...(recentPaymentLines.length ? recentPaymentLines : ["- None"]),
    "",
    "Notes:",
    "- This report is generated automatically from Stripe checkout events stored in Zygenic.",
    "- The CSV ledger is Excel-friendly and can be opened directly in Excel/Sheets.",
  ];

  await Promise.all([
    upsertSystemBusinessFile({
      userId,
      fileName: "stripe-accounting-ledger.csv",
      body: `${csvLines.join("\n")}\n`,
      mimeType: "text/csv",
      relatedRef: "STRIPE_ACCOUNTING_LEDGER",
    }),
    upsertSystemBusinessFile({
      userId,
      fileName: "stripe-financial-analysis.txt",
      body: `${analysisLines.join("\n")}\n`,
      mimeType: "text/plain",
      relatedRef: "STRIPE_FINANCIAL_ANALYSIS",
    }),
  ]);
}

export async function ensureStripeFinanceArtifacts(userId: string) {
  await upsertFinanceArtifacts(userId);
}

export async function recordStripeCheckoutPayment(input: RecordPaymentInput) {
  const metadata = input.session.metadata ?? {};
  const orderId = metadata.orderId?.trim() || null;
  const userIdFromMetadata = metadata.userId?.trim() || null;
  const order = orderId
    ? await prisma.agentPurchaseOrder.findUnique({ where: { id: orderId } })
    : await prisma.agentPurchaseOrder.findFirst({
        where: { checkoutSessionId: input.session.id },
        orderBy: { createdAt: "desc" },
      });
  const userId = order?.userId ?? userIdFromMetadata;
  if (!userId) return null;

  const paidAt =
    input.session.payment_status === "paid"
      ? new Date(((input.session.created ?? Math.floor(Date.now() / 1000)) || Math.floor(Date.now() / 1000)) * 1000)
      : null;

  const row = await prisma.stripePayment.upsert({
    where: { checkoutSessionId: input.session.id },
    update: {
      stripeEventId: input.stripeEventId ?? undefined,
      paymentIntentId: input.session.payment_intent?.toString() ?? null,
      amountTotal: Math.max(0, Math.floor(Number(input.session.amount_total ?? 0) || 0)),
      currency: cleanCurrency(input.session.currency),
      paymentStatus: (input.session.payment_status || "unknown").slice(0, 40),
      mode: (input.session.mode || "payment").slice(0, 40),
      agentKind: metadata.agentKind?.slice(0, 80) || null,
      schedule: metadata.schedule?.slice(0, 80) || null,
      metadataJson: JSON.stringify(metadata),
      paidAt,
    },
    create: {
      userId,
      stripeEventId: input.stripeEventId ?? null,
      checkoutSessionId: input.session.id,
      paymentIntentId: input.session.payment_intent?.toString() ?? null,
      amountTotal: Math.max(0, Math.floor(Number(input.session.amount_total ?? 0) || 0)),
      currency: cleanCurrency(input.session.currency),
      paymentStatus: (input.session.payment_status || "unknown").slice(0, 40),
      mode: (input.session.mode || "payment").slice(0, 40),
      agentKind: metadata.agentKind?.slice(0, 80) || null,
      schedule: metadata.schedule?.slice(0, 80) || null,
      metadataJson: JSON.stringify(metadata),
      paidAt,
    },
  });

  const matchedOrder =
    order ??
    (await prisma.agentPurchaseOrder.findFirst({
      where: { checkoutSessionId: row.checkoutSessionId, userId: row.userId },
      orderBy: { createdAt: "desc" },
    }));

  if (matchedOrder) {
    const nextStatus =
      row.paymentStatus === "paid" ? "PAID" : row.paymentStatus === "unpaid" ? "PAYMENT_PENDING" : "PAYMENT_FAILED";

    const alreadyFulfilled = Boolean(matchedOrder.fulfilledAt);
    const isSupportedCheckoutMode = row.mode === "payment" || row.mode === "subscription";
    const shouldFulfill = row.paymentStatus === "paid" && isSupportedCheckoutMode && !alreadyFulfilled;

    let fulfilledAt = matchedOrder.fulfilledAt;
    if (shouldFulfill) {
      const agentKind = matchedOrder.agentKind;
      const schedule = matchedOrder.schedule;
      await createHiredJobIfMissing({ userId: row.userId, agentKind, schedule });
      fulfilledAt = new Date();
    }

    const finalStatus = alreadyFulfilled ? "FULFILLED" : shouldFulfill ? "FULFILLED" : nextStatus;

    await prisma.agentPurchaseOrder.update({
      where: { id: matchedOrder.id },
      data: {
        checkoutSessionId: row.checkoutSessionId,
        stripeEventId: input.stripeEventId ?? null,
        stripePaymentId: row.id,
        stripeSubscriptionId: input.session.subscription?.toString() ?? matchedOrder.stripeSubscriptionId ?? null,
        status: finalStatus,
        failureReason: row.paymentStatus === "paid" ? null : matchedOrder.failureReason,
        fulfilledAt,
      },
    });
  }

  // Handle additional orders from basket checkout (orderIds metadata)
  const orderIdsStr = metadata.orderIds?.trim();
  if (orderIdsStr && row.paymentStatus === "paid") {
    const allOrderIds = orderIdsStr.split(",").filter(Boolean);
    for (const oid of allOrderIds) {
      if (oid === orderId) continue; // already processed above
      const extraOrder = await prisma.agentPurchaseOrder.findUnique({ where: { id: oid } });
      if (extraOrder && !extraOrder.fulfilledAt) {
        await createHiredJobIfMissing({
          userId: extraOrder.userId,
          agentKind: extraOrder.agentKind,
          schedule: extraOrder.schedule,
        });
        await prisma.agentPurchaseOrder.update({
          where: { id: oid },
          data: {
            status: "FULFILLED",
            fulfilledAt: new Date(),
            checkoutSessionId: row.checkoutSessionId,
            stripePaymentId: row.id,
          },
        });
      }
    }
  }

  if (row.paymentStatus === "paid") {
    await upsertFinanceArtifacts(row.userId);
  }

  return row;
}
