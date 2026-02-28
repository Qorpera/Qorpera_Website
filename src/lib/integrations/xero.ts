const XERO_BASE = "https://api.xero.com/api.xro/2.0";

async function xeroFetch(
  token: string,
  tenantId: string,
  path: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${XERO_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Xero-tenant-id": tenantId,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Xero API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function getConnections(
  token: string,
): Promise<Array<{ tenantId: string; tenantName: string; tenantType: string }>> {
  const res = await fetch("https://api.xero.com/connections", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Xero connections error: ${res.status}`);
  return res.json() as Promise<Array<{ tenantId: string; tenantName: string; tenantType: string }>>;
}

export async function getProfitAndLoss(
  token: string,
  tenantId: string,
  fromDate?: string,
  toDate?: string,
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return xeroFetch(token, tenantId, `/Reports/ProfitAndLoss${qs}`);
}

export async function getBalanceSheet(
  token: string,
  tenantId: string,
  date?: string,
): Promise<Record<string, unknown>> {
  const qs = date ? `?date=${date}` : "";
  return xeroFetch(token, tenantId, `/Reports/BalanceSheet${qs}`);
}

export async function getTrialBalance(
  token: string,
  tenantId: string,
  date?: string,
): Promise<Record<string, unknown>> {
  const qs = date ? `?date=${date}` : "";
  return xeroFetch(token, tenantId, `/Reports/TrialBalance${qs}`);
}

export async function listInvoices(
  token: string,
  tenantId: string,
  type: "ACCREC" | "ACCPAY" = "ACCREC",
  page = 1,
): Promise<Record<string, unknown>> {
  return xeroFetch(
    token,
    tenantId,
    `/Invoices?Type=${type}&Status=AUTHORISED&page=${page}&order=DueDate+DESC`,
  );
}

export async function listAccounts(
  token: string,
  tenantId: string,
): Promise<Record<string, unknown>> {
  return xeroFetch(token, tenantId, "/Accounts");
}
