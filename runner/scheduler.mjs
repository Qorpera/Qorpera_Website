/**
 * Zygenic Background Scheduler
 *
 * Standalone Node process that calls POST /api/scheduler/tick at a configurable interval.
 * This triggers agent automation scheduling (wake-ups, queued task execution, etc.)
 *
 * Environment variables:
 *   WF_SCHEDULER_BASE_URL  - Server base URL (default: http://localhost:3000)
 *   WF_SCHEDULER_TOKEN     - Bearer token for authentication (uses wf_session cookie if not set)
 *   WF_SCHEDULER_TICK_INTERVAL_MS - Tick interval in ms (default: 60000 = 60s)
 *
 * Usage:
 *   node runner/scheduler.mjs
 *   npm run scheduler
 */

const BASE_URL = process.env.WF_SCHEDULER_BASE_URL || "http://localhost:3000";
const TOKEN = process.env.WF_SCHEDULER_TOKEN || "";
const TICK_INTERVAL = Math.max(
  5000,
  Number(process.env.WF_SCHEDULER_TICK_INTERVAL_MS) || 60000,
);

let running = true;
let tickCount = 0;

function timestamp() {
  return new Date().toISOString();
}

function log(level, message, data) {
  const entry = { ts: timestamp(), level, message, ...(data ? { data } : {}) };
  console.log(JSON.stringify(entry));
}

async function tick() {
  tickCount++;
  const url = `${BASE_URL}/api/scheduler/tick`;
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) {
    headers["Authorization"] = `Bearer ${TOKEN}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(180000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      log("warn", `Scheduler tick ${tickCount} failed`, {
        status: response.status,
        body: text.slice(0, 500),
      });
      return;
    }

    const data = await response.json().catch(() => null);
    log("info", `Scheduler tick ${tickCount} complete`, {
      utcTime: data?.utcTime,
      created: data?.created?.length ?? 0,
      executed: data?.executed ?? 0,
    });
  } catch (err) {
    log("error", `Scheduler tick ${tickCount} error`, {
      message: err.message || String(err),
    });
  }
}

async function run() {
  log("info", "Scheduler started", {
    baseUrl: BASE_URL,
    intervalMs: TICK_INTERVAL,
    hasToken: Boolean(TOKEN),
  });

  while (running) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, TICK_INTERVAL));
  }

  log("info", "Scheduler stopped", { totalTicks: tickCount });
}

function shutdown(signal) {
  log("info", `Received ${signal}, shutting down gracefully`);
  running = false;
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

run().catch((err) => {
  log("error", "Scheduler fatal error", { message: err.message || String(err) });
  process.exit(1);
});
