/**
 * Browser automation client for Zygenic.
 * Connects to a remote Playwright/Puppeteer service via BROWSER_AUTOMATION_URL.
 * The service must expose a REST API that accepts task instructions.
 */

export type BrowserTaskRequest = {
  /** Natural language instructions for the browser agent */
  task: string;
  /** Optional starting URL */
  startUrl?: string;
  /** Max time in seconds before aborting */
  timeoutSeconds?: number;
  /** Whether to return a screenshot of the final page state */
  screenshot?: boolean;
};

export type BrowserTaskResult =
  | { ok: true; output: string; screenshotBase64?: string; durationMs: number }
  | { ok: false; error: string; durationMs: number };

function getBrowserServiceUrl(): string | null {
  return process.env.BROWSER_AUTOMATION_URL ?? process.env.PLAYWRIGHT_SERVICE_URL ?? null;
}

/** Returns true if the browser automation service is configured and reachable. */
export async function checkBrowserServiceHealth(): Promise<{ configured: boolean; healthy: boolean; hint: string }> {
  const serviceUrl = getBrowserServiceUrl();
  if (!serviceUrl) {
    return {
      configured: false,
      healthy: false,
      hint: "Set BROWSER_AUTOMATION_URL to enable interactive browser actions.",
    };
  }

  try {
    const healthUrl = new URL("/health", serviceUrl).toString();
    const res = await fetch(healthUrl, { method: "GET", signal: AbortSignal.timeout(3000) });
    return {
      configured: true,
      healthy: res.ok,
      hint: res.ok ? "Browser automation service is reachable." : `Service responded with status ${res.status}.`,
    };
  } catch {
    return {
      configured: true,
      healthy: false,
      hint: "Browser automation service URL is set but not reachable.",
    };
  }
}

/**
 * Execute a browser automation task via the remote service.
 *
 * Expected service API:
 *   POST /execute
 *   Body: { task, startUrl?, timeoutSeconds?, screenshot? }
 *   Response: { ok: true, output: string, screenshotBase64?: string }
 *          or { ok: false, error: string }
 */
export async function executeBrowserTask(request: BrowserTaskRequest): Promise<BrowserTaskResult> {
  const serviceUrl = getBrowserServiceUrl();
  if (!serviceUrl) {
    return { ok: false, error: "Browser automation service is not configured.", durationMs: 0 };
  }

  const start = Date.now();
  try {
    const executeUrl = new URL("/execute", serviceUrl).toString();
    const timeoutMs = (request.timeoutSeconds ?? 60) * 1000;
    const res = await fetch(executeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: request.task,
        startUrl: request.startUrl,
        timeoutSeconds: request.timeoutSeconds ?? 60,
        screenshot: request.screenshot ?? false,
      }),
      signal: AbortSignal.timeout(timeoutMs + 5000),
    });

    const durationMs = Date.now() - start;

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Browser service error (${res.status}): ${body.slice(0, 200)}`, durationMs };
    }

    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      output?: string;
      error?: string;
      screenshotBase64?: string;
    } | null;

    if (!data) return { ok: false, error: "Invalid response from browser service", durationMs };

    if (data.ok === false) {
      return { ok: false, error: data.error ?? "Browser task failed", durationMs };
    }

    return {
      ok: true,
      output: data.output ?? "",
      screenshotBase64: data.screenshotBase64,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Browser automation request failed: ${msg}`, durationMs };
  }
}
