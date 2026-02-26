import { CredentialMode, CredentialStatus, ProviderName } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto-secrets";

export type SupportedProvider = "OPENAI" | "ANTHROPIC" | "GOOGLE";

export type CloudConnectorView = {
  provider: SupportedProvider;
  mode: "MANAGED" | "BYOK";
  status: "CONNECTED" | "NEEDS_ATTENTION" | "PENDING";
  label: string | null;
  keyLast4: string | null;
  managedAvailable: boolean;
  hasStoredKey: boolean;
  updatedAt: string | null;
  monthlyRequestLimit: number;
  monthlyRequestCount: number;
  monthlyUsdLimit: number;
  monthlyEstimatedUsd: number;
  usageMonthKey: string | null;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
};

type TestResult = {
  ok: boolean;
  message: string;
  statusCode?: number;
};

const PROVIDERS: SupportedProvider[] = ["OPENAI", "ANTHROPIC", "GOOGLE"];

function providerEnum(provider: SupportedProvider): ProviderName {
  if (provider === "OPENAI") return ProviderName.OPENAI;
  if (provider === "ANTHROPIC") return ProviderName.ANTHROPIC;
  return ProviderName.GOOGLE;
}

function managedEnvAvailable(provider: SupportedProvider) {
  if (provider === "OPENAI") return Boolean(process.env.OPENAI_API_KEY);
  if (provider === "ANTHROPIC") return Boolean(process.env.ANTHROPIC_API_KEY);
  return Boolean(process.env.GOOGLE_API_KEY);
}

function getManagedEnvKey(provider: SupportedProvider) {
  if (provider === "OPENAI") return process.env.OPENAI_API_KEY ?? null;
  if (provider === "ANTHROPIC") return process.env.ANTHROPIC_API_KEY ?? null;
  return process.env.GOOGLE_API_KEY ?? null;
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toView(
  provider: SupportedProvider,
  row:
    | {
        provider: ProviderName;
        mode: CredentialMode;
        status: CredentialStatus;
        label: string | null;
        keyLast4: string | null;
        encryptedKey: string | null;
        updatedAt: Date;
        monthlyRequestLimit: number;
        monthlyRequestCount: number;
        monthlyUsdLimit: number;
        monthlyEstimatedUsd: number;
        usageMonthKey: string | null;
        lastTestedAt: Date | null;
        lastTestStatus: string | null;
        lastTestMessage: string | null;
      }
    | null,
): CloudConnectorView {
  return {
    provider,
    mode: (row?.mode ?? CredentialMode.MANAGED) as CloudConnectorView["mode"],
    status: (row?.status ?? CredentialStatus.PENDING) as CloudConnectorView["status"],
    label: row?.label ?? (provider === "OPENAI" ? "Managed by Zygenic" : null),
    keyLast4: row?.keyLast4 ?? null,
    managedAvailable: managedEnvAvailable(provider),
    hasStoredKey: Boolean(row?.encryptedKey),
    updatedAt: row?.updatedAt?.toISOString() ?? null,
    monthlyRequestLimit: row?.monthlyRequestLimit ?? 500,
    monthlyRequestCount: row?.monthlyRequestCount ?? 0,
    monthlyUsdLimit: row?.monthlyUsdLimit ?? 10,
    monthlyEstimatedUsd: row?.monthlyEstimatedUsd ?? 0,
    usageMonthKey: row?.usageMonthKey ?? null,
    lastTestedAt: row?.lastTestedAt?.toISOString() ?? null,
    lastTestStatus: row?.lastTestStatus ?? null,
    lastTestMessage: row?.lastTestMessage ?? null,
  };
}

async function getConnectorRow(userId: string, provider: SupportedProvider) {
  return prisma.providerCredential.findUnique({
    where: { userId_provider: { userId, provider: providerEnum(provider) } },
  });
}

export async function getCloudConnector(userId: string, provider: SupportedProvider = "OPENAI"): Promise<CloudConnectorView> {
  const row = await getConnectorRow(userId, provider);
  return toView(provider, row);
}

export async function getCloudConnectors(userId: string): Promise<CloudConnectorView[]> {
  const rows = await prisma.providerCredential.findMany({
    where: { userId, provider: { in: PROVIDERS.map(providerEnum) } },
  });
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  return PROVIDERS.map((provider) => toView(provider, byProvider.get(providerEnum(provider)) ?? null));
}

async function upsertConnectorBase(
  userId: string,
  provider: SupportedProvider,
  data: {
    mode: CredentialMode;
    label?: string | null;
    encryptedKey?: string | null;
    keyLast4?: string | null;
    status: CredentialStatus;
  },
) {
  return prisma.providerCredential.upsert({
    where: { userId_provider: { userId, provider: providerEnum(provider) } },
    update: {
      mode: data.mode,
      label: data.label ?? undefined,
      encryptedKey: data.encryptedKey ?? undefined,
      keyLast4: data.keyLast4 ?? undefined,
      status: data.status,
      usageMonthKey: currentMonthKey(),
    },
    create: {
      userId,
      provider: providerEnum(provider),
      mode: data.mode,
      label: data.label ?? null,
      encryptedKey: data.encryptedKey ?? null,
      keyLast4: data.keyLast4 ?? null,
      status: data.status,
      usageMonthKey: currentMonthKey(),
    },
  });
}

export async function setManagedConnector(userId: string, label?: string, provider: SupportedProvider = "OPENAI") {
  const row = await upsertConnectorBase(userId, provider, {
    mode: CredentialMode.MANAGED,
    label: label ?? "Managed by Zygenic",
    status: managedEnvAvailable(provider) ? CredentialStatus.CONNECTED : CredentialStatus.NEEDS_ATTENTION,
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "CONNECTOR",
      entityId: row.id,
      action: "SET_MANAGED",
      summary: `Cloud connector set to managed mode (${provider})`,
    },
  });

  return toView(provider, row);
}

function basicKeyLooksValid(provider: SupportedProvider, key: string) {
  const normalized = key.trim();
  if (provider === "OPENAI") return normalized.startsWith("sk-") && normalized.length >= 20;
  if (provider === "ANTHROPIC") return normalized.startsWith("sk-ant-") || normalized.length > 20;
  return normalized.length > 20; // Google AI Studio keys vary in prefix
}

export async function setByokConnector(userId: string, apiKey: string, label?: string, provider: SupportedProvider = "OPENAI") {
  const normalized = apiKey.trim();
  const looksValid = basicKeyLooksValid(provider, normalized);
  const row = await upsertConnectorBase(userId, provider, {
    mode: CredentialMode.BYOK,
    encryptedKey: encryptSecret(normalized),
    keyLast4: normalized.slice(-4),
    label: label ?? `${provider} (BYOK)`,
    status: looksValid ? CredentialStatus.CONNECTED : CredentialStatus.NEEDS_ATTENTION,
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "CONNECTOR",
      entityId: row.id,
      action: "SET_BYOK",
      summary: `Cloud connector saved (${provider} BYOK, key ••••${normalized.slice(-4)})`,
    },
  });

  return toView(provider, row);
}

export async function clearByokConnector(userId: string, provider: SupportedProvider = "OPENAI") {
  const row = await getConnectorRow(userId, provider);
  if (!row) return toView(provider, null);

  const updated = await prisma.providerCredential.update({
    where: { id: row.id },
    data: {
      encryptedKey: null,
      keyLast4: null,
      mode: CredentialMode.MANAGED,
      status: managedEnvAvailable(provider) ? CredentialStatus.CONNECTED : CredentialStatus.NEEDS_ATTENTION,
      label: "Managed by Zygenic",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "CONNECTOR",
      entityId: row.id,
      action: "CLEAR_BYOK",
      summary: `Removed BYOK key and switched to managed mode (${provider})`,
    },
  });

  return toView(provider, updated);
}

export async function updateConnectorGuardrails(
  userId: string,
  provider: SupportedProvider,
  patch: Partial<Pick<CloudConnectorView, "monthlyRequestLimit" | "monthlyUsdLimit">>,
) {
  const row = await prisma.providerCredential.upsert({
    where: { userId_provider: { userId, provider: providerEnum(provider) } },
    update: {
      monthlyRequestLimit: patch.monthlyRequestLimit ?? undefined,
      monthlyUsdLimit: patch.monthlyUsdLimit ?? undefined,
      usageMonthKey: currentMonthKey(),
    },
    create: {
      userId,
      provider: providerEnum(provider),
      mode: CredentialMode.MANAGED,
      status: managedEnvAvailable(provider) ? CredentialStatus.CONNECTED : CredentialStatus.PENDING,
      label: "Managed by Zygenic",
      monthlyRequestLimit: patch.monthlyRequestLimit ?? 500,
      monthlyUsdLimit: patch.monthlyUsdLimit ?? 10,
      usageMonthKey: currentMonthKey(),
    },
  });

  return toView(provider, row);
}

async function normalizeUsageWindow(userId: string, provider: SupportedProvider) {
  const row = await getConnectorRow(userId, provider);
  if (!row) return null;
  const month = currentMonthKey();
  if (row.usageMonthKey === month) return row;
  return prisma.providerCredential.update({
    where: { id: row.id },
    data: {
      usageMonthKey: month,
      monthlyRequestCount: 0,
      monthlyEstimatedUsd: 0,
    },
  });
}

export async function checkManagedGuardrails(userId: string, provider: SupportedProvider = "OPENAI") {
  const row = await normalizeUsageWindow(userId, provider);
  if (!row) {
    return { allowed: true, reason: null as string | null, usage: toView(provider, null) };
  }
  if (row.mode !== CredentialMode.MANAGED) return { allowed: true, reason: null, usage: toView(provider, row) };
  if (row.monthlyRequestCount >= row.monthlyRequestLimit) {
    return { allowed: false, reason: "Managed monthly request limit reached", usage: toView(provider, row) };
  }
  if (row.monthlyEstimatedUsd >= row.monthlyUsdLimit) {
    return { allowed: false, reason: "Managed monthly spend guardrail reached", usage: toView(provider, row) };
  }
  return { allowed: true, reason: null, usage: toView(provider, row) };
}

export async function recordManagedUsage(
  userId: string,
  provider: SupportedProvider = "OPENAI",
  usage: { requestCount?: number; estimatedUsd?: number } = {},
) {
  const row = await normalizeUsageWindow(userId, provider);
  if (!row || row.mode !== CredentialMode.MANAGED) return;
  await prisma.providerCredential.update({
    where: { id: row.id },
    data: {
      monthlyRequestCount: { increment: usage.requestCount ?? 1 },
      monthlyEstimatedUsd: { increment: usage.estimatedUsd ?? 0.01 },
    },
  });
}

export async function getProviderApiKeyRuntime(userId: string, provider: SupportedProvider) {
  const row = await getConnectorRow(userId, provider);
  if (!row) {
    return { apiKey: getManagedEnvKey(provider), mode: "MANAGED" as const, credential: null };
  }
  if (row.mode === CredentialMode.MANAGED) {
    return { apiKey: getManagedEnvKey(provider), mode: "MANAGED" as const, credential: row };
  }
  if (!row.encryptedKey) return { apiKey: null, mode: "BYOK" as const, credential: row };
  try {
    return { apiKey: decryptSecret(row.encryptedKey), mode: "BYOK" as const, credential: row };
  } catch {
    return { apiKey: null, mode: "BYOK" as const, credential: row };
  }
}

export async function getUserOpenAiApiKey(userId: string): Promise<string | null> {
  const runtime = await getProviderApiKeyRuntime(userId, "OPENAI");
  return runtime.apiKey;
}

async function testOpenAi(apiKey: string): Promise<TestResult> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return { ok: false, message: `OpenAI test failed (${res.status})`, statusCode: res.status };
  return { ok: true, message: "OpenAI connection verified" };
}

async function testAnthropic(apiKey: string): Promise<TestResult> {
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!res.ok) return { ok: false, message: `Anthropic test failed (${res.status})`, statusCode: res.status };
  return { ok: true, message: "Anthropic connection verified" };
}

async function testGoogle(apiKey: string): Promise<TestResult> {
  const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
  url.searchParams.set("key", apiKey);
  const res = await fetch(url);
  if (!res.ok) return { ok: false, message: `Google AI test failed (${res.status})`, statusCode: res.status };
  return { ok: true, message: "Google AI connection verified" };
}

export async function testConnectorConnection(userId: string, provider: SupportedProvider) {
  const runtime = await getProviderApiKeyRuntime(userId, provider);
  if (!runtime.apiKey) {
    const row = await getConnectorRow(userId, provider);
    if (row) {
      await prisma.providerCredential.update({
        where: { id: row.id },
        data: {
          status: CredentialStatus.NEEDS_ATTENTION,
          lastTestedAt: new Date(),
          lastTestStatus: "FAILED",
          lastTestMessage: "No API key available for this connector mode",
        },
      });
    }
    return { ok: false, message: "No API key available for this connector mode" };
  }

  const result =
    provider === "OPENAI"
      ? await testOpenAi(runtime.apiKey)
      : provider === "ANTHROPIC"
        ? await testAnthropic(runtime.apiKey)
        : await testGoogle(runtime.apiKey);

  const row = await prisma.providerCredential.upsert({
    where: { userId_provider: { userId, provider: providerEnum(provider) } },
    update: {
      status: result.ok ? CredentialStatus.CONNECTED : CredentialStatus.NEEDS_ATTENTION,
      lastTestedAt: new Date(),
      lastTestStatus: result.ok ? "PASSED" : "FAILED",
      lastTestMessage: result.message,
      usageMonthKey: currentMonthKey(),
    },
    create: {
      userId,
      provider: providerEnum(provider),
      mode: CredentialMode.MANAGED,
      status: result.ok ? CredentialStatus.CONNECTED : CredentialStatus.NEEDS_ATTENTION,
      label: "Managed by Zygenic",
      lastTestedAt: new Date(),
      lastTestStatus: result.ok ? "PASSED" : "FAILED",
      lastTestMessage: result.message,
      usageMonthKey: currentMonthKey(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "CONNECTOR",
      entityId: row.id,
      action: "TEST_CONNECTION",
      summary: `${provider} connection test ${result.ok ? "passed" : "failed"}: ${result.message}`,
    },
  });

  return { ...result, connector: toView(provider, row) };
}
