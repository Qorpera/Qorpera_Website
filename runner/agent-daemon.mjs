/**
 * Agent Daemon — always-on process for continuous agent execution.
 *
 * Runs as a standalone Node.js process (same pattern as runner/daemon.mjs).
 * Core loop: heartbeat → check always-on agents → poll tasks → execute → sleep.
 *
 * Env:
 *   WF_DAEMON_BASE_URL — base URL of the Qorpera server (e.g. http://localhost:3000)
 *   WF_DAEMON_TOKEN    — bearer token for daemon API auth
 *   WF_DAEMON_USER_ID  — user ID to manage agents for
 *   WF_DAEMON_POLL_INTERVAL_MS — poll interval in ms (default 5000)
 */

import crypto from "node:crypto";

const BASE_URL = process.env.WF_DAEMON_BASE_URL || "http://localhost:3000";
const TOKEN = process.env.WF_DAEMON_TOKEN;
const USER_ID = process.env.WF_DAEMON_USER_ID;
const POLL_INTERVAL = parseInt(process.env.WF_DAEMON_POLL_INTERVAL_MS || "5000", 10);
const PROCESS_ID = `daemon-${crypto.randomUUID().slice(0, 8)}`;

if (!TOKEN) {
  console.error("[agent-daemon] WF_DAEMON_TOKEN is required");
  process.exit(1);
}
if (!USER_ID) {
  console.error("[agent-daemon] WF_DAEMON_USER_ID is required");
  process.exit(1);
}

let running = true;
let activeExecutions = 0;

/** Make an authenticated fetch to the daemon API. */
async function daemonFetch(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Daemon API ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

/** Send heartbeat and get agent list + queued counts. */
async function heartbeat() {
  return daemonFetch("/api/daemon/heartbeat", {
    method: "POST",
    body: JSON.stringify({
      processId: PROCESS_ID,
      activeAgents: activeExecutions,
      userId: USER_ID,
    }),
  });
}

/** Get pending tasks for a specific agent. */
async function getEvents(agentTarget) {
  return daemonFetch(`/api/daemon/events?userId=${USER_ID}&agentTarget=${agentTarget}&limit=1`);
}

/** Execute a specific task. */
async function executeTask(taskId) {
  return daemonFetch("/api/daemon/execute", {
    method: "POST",
    body: JSON.stringify({ userId: USER_ID, taskId }),
  });
}

/** Main loop. */
async function mainLoop() {
  console.log(`[agent-daemon] Started (processId=${PROCESS_ID}, userId=${USER_ID}, poll=${POLL_INTERVAL}ms)`);

  while (running) {
    try {
      // 1. Heartbeat
      const hb = await heartbeat();
      const agents = hb.agents || [];
      const queuedCounts = hb.queuedCounts || [];

      if (agents.length === 0) {
        await sleep(POLL_INTERVAL * 2);
        continue;
      }

      // 2. Check each always-on agent for work
      for (const agent of agents) {
        if (!running) break;

        const queueInfo = queuedCounts.find((q) => q.agentTarget === agent.agentTarget);
        if (!queueInfo || queueInfo.queuedTasks === 0) continue;

        // Check concurrency limit
        if (activeExecutions >= agent.maxConcurrentTasks) continue;

        // 3. Get next task
        const events = await getEvents(agent.agentTarget);
        const tasks = events.tasks || [];
        if (tasks.length === 0) continue;

        // 4. Execute task
        const task = tasks[0];
        console.log(`[agent-daemon] Executing task ${task.id} for ${agent.agentTarget}: ${task.title}`);

        activeExecutions++;
        executeTask(task.id)
          .then(() => {
            console.log(`[agent-daemon] Task ${task.id} completed`);
          })
          .catch((err) => {
            console.error(`[agent-daemon] Task ${task.id} failed:`, err.message);
          })
          .finally(() => {
            activeExecutions--;
          });
      }
    } catch (err) {
      console.error("[agent-daemon] Loop error:", err.message);
    }

    await sleep(POLL_INTERVAL);
  }

  console.log("[agent-daemon] Shutting down...");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Graceful shutdown
process.on("SIGINT", () => { running = false; });
process.on("SIGTERM", () => { running = false; });

mainLoop().catch((err) => {
  console.error("[agent-daemon] Fatal error:", err);
  process.exit(1);
});
