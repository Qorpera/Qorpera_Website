const QB_BASE = "https://quickbooks.api.intuit.com/v3/company";
const MINOR_VERSION = "65";

async function qbFetch(token: string, realmId: string, path: string): Promise<Record<string, unknown>> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${QB_BASE}/${realmId}${path}${sep}minorversion=${MINOR_VERSION}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`QuickBooks API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function getProfitAndLoss(
  token: string,
  realmId: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, unknown>> {
  return qbFetch(token, realmId, `/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`);
}

export async function getBalanceSheet(
  token: string,
  realmId: string,
  date?: string,
): Promise<Record<string, unknown>> {
  const qs = date ? `?date=${date}` : "";
  return qbFetch(token, realmId, `/reports/BalanceSheet${qs}`);
}

export async function getCashFlow(
  token: string,
  realmId: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, unknown>> {
  return qbFetch(token, realmId, `/reports/CashFlow?start_date=${startDate}&end_date=${endDate}`);
}

export async function listInvoices(
  token: string,
  realmId: string,
  maxResults = 20,
): Promise<Record<string, unknown>> {
  const max = Math.min(maxResults, 50);
  const query = `SELECT * FROM Invoice ORDER BY TxnDate DESC MAXRESULTS ${max}`;
  return qbFetch(token, realmId, `/query?query=${encodeURIComponent(query)}`);
}

export async function getCompanyInfo(
  token: string,
  realmId: string,
): Promise<Record<string, unknown>> {
  return qbFetch(token, realmId, `/companyinfo/${realmId}`);
}
