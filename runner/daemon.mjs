#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import path from "node:path";
import process from "node:process";

const BASE_URL = (process.env.WF_RUNNER_BASE_URL || "").replace(/\/$/, "");
const AUTH_TOKEN = process.env.WF_RUNNER_TOKEN || "";
const POLL_INTERVAL_MS = clampInt(process.env.WF_RUNNER_POLL_INTERVAL_MS, 3000, 500, 60000);
const HEARTBEAT_INTERVAL_MS = clampInt(process.env.WF_RUNNER_HEARTBEAT_INTERVAL_MS, 15000, 1000, 120000);
const POLICY_REFRESH_INTERVAL_MS = clampInt(process.env.WF_RUNNER_POLICY_REFRESH_INTERVAL_MS, 30000, 2000, 300000);
const LEASE_SECONDS = clampInt(process.env.WF_RUNNER_LEASE_SECONDS, 120, 15, 900);
const MAX_EVENT_BATCH = clampInt(process.env.WF_RUNNER_MAX_EVENT_BATCH, 40, 1, 200);
const DEFAULT_TIMEOUT_SECONDS = clampInt(process.env.WF_RUNNER_DEFAULT_TIMEOUT_SECONDS, 600, 5, 7200);
const ALLOWED_ROOTS = parsePathList(process.env.WF_RUNNER_ALLOWED_ROOTS);
const ALLOWED_COMMANDS = parseList(process.env.WF_RUNNER_ALLOWED_COMMANDS);
const RUNNER_LABEL = process.env.WF_RUNNER_LABEL || null;
const RUNNER_NAME = process.env.WF_RUNNER_NAME || `Local Runner (${hostname()})`;
const RUNNER_ENVIRONMENT = process.env.WF_RUNNER_ENVIRONMENT || "desktop";
const DEFAULT_ALLOWED_COMMANDS = ["git", "npm", "node", "npx", "pnpm", "yarn", "bun", "docker", "docker-compose", "prisma", "sqlite3", "ls", "cat", "pwd", "echo", "python3", "python", "uv", "pip", "gh"];
const NETWORK_HEAVY_COMMANDS = new Set(["curl", "wget", "http", "https"]);

let stopping = false;
let busy = false;
let lastHeartbeatAt = 0;
let lastPolicyFetchAt = 0;
let serverPolicy = null;
let cachedNodePty = undefined;

if (!BASE_URL || !AUTH_TOKEN) {
  console.error("Missing required env vars: WF_RUNNER_BASE_URL and WF_RUNNER_TOKEN");
  process.exit(1);
}

if (ALLOWED_ROOTS.length === 0) {
  console.error("WF_RUNNER_ALLOWED_ROOTS is required (comma/colon-separated absolute paths)");
  process.exit(1);
}

console.log("[runner] starting");
console.log(`[runner] baseUrl=${BASE_URL}`);
console.log(`[runner] name=${RUNNER_NAME} env=${RUNNER_ENVIRONMENT}`);
console.log(`[runner] allowedRoots=${ALLOWED_ROOTS.join(", ")}`);
console.log(`[runner] allowedCommands=${ALLOWED_COMMANDS.length ? ALLOWED_COMMANDS.join(", ") : "(default set)"}`);

process.on("SIGINT", () => {
  stopping = true;
  console.log("[runner] received SIGINT, stopping...");
});
process.on("SIGTERM", () => {
  stopping = true;
  console.log("[runner] received SIGTERM, stopping...");
});

await mainLoop();

async function mainLoop() {
  while (!stopping) {
    try {
      const now = Date.now();
      if (!serverPolicy || now - lastPolicyFetchAt >= POLICY_REFRESH_INTERVAL_MS) {
        await refreshPolicy().catch((error) => {
          console.error("[runner] policy refresh failed:", error instanceof Error ? error.message : String(error));
        });
      }
      if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
        await heartbeat();
        lastHeartbeatAt = now;
      }
      if (!busy) {
        await pollAndRun();
      }
    } catch (error) {
      console.error("[runner] loop error:", error instanceof Error ? error.message : String(error));
    }
    await sleep(POLL_INTERVAL_MS);
  }
  console.log("[runner] stopped");
}

async function heartbeat() {
  const effective = getEffectiveExecutionPolicy();
  const ptySupported = Boolean(await loadNodePty(false));
  const capabilities = {
    command_exec: true,
    command_interactive: true,
    file_read: true,
    file_write: true,
    files_direct: false,
    pty: ptySupported,
    supportedJobTypes: [
      "command.exec",
      "command.interactive",
      ...(ptySupported ? ["command.pty"] : []),
      "file.read",
      "file.write",
      "health.check",
    ],
    allowedRoots: effective.allowedRoots,
    allowedCommands: effective.allowedCommands,
    networkPolicy: effective.network,
    policyTemplate: serverPolicy?.templateName ?? null,
    policyVersion: serverPolicy?.version ?? null,
  };
  const payload = {
    hostName: hostname(),
    osName: `${process.platform}/${process.arch}`,
    runnerVersion: "0.1.0",
    capabilities,
    metadata: {
      label: RUNNER_LABEL,
      environment: RUNNER_ENVIRONMENT,
      pid: process.pid,
    },
  };
  const res = await apiFetch("/api/runners/heartbeat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`heartbeat failed (${res.status}): ${text}`);
  }
}

async function refreshPolicy() {
  const res = await apiFetch("/api/runners/policy/resolve", { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`policy resolve failed (${res.status}): ${text}`);
  }
  const data = await res.json().catch(() => ({}));
  if (data?.policy && typeof data.policy === "object") {
    serverPolicy = data.policy;
    lastPolicyFetchAt = Date.now();
  }
  return data;
}

async function pollAndRun() {
  const res = await apiFetch("/api/runners/jobs/poll", {
    method: "POST",
    body: JSON.stringify({ limit: 1, leaseSeconds: LEASE_SECONDS }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`poll failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  if (jobs.length === 0) return;

  for (const job of jobs) {
    if (stopping) break;
    busy = true;
    try {
      await runJob(job);
    } finally {
      busy = false;
    }
  }
}

async function runJob(job) {
  const leaseToken = String(job.leaseToken || "");
  if (!leaseToken) {
    console.warn("[runner] skipping job without leaseToken", job.id);
    return;
  }
  console.log(`[runner] leased job ${job.id} (${job.jobType}) ${job.title}`);
  const control = {
    canceled: false,
    cancelReason: null,
  };

  await postJson(`/api/runners/jobs/${encodeURIComponent(job.id)}/start`, {
    leaseToken,
  });

  const eventBuffer = [];
  const flushEvents = async () => {
    if (eventBuffer.length === 0) return;
    const batch = eventBuffer.splice(0, MAX_EVENT_BATCH);
    try {
      const response = await postJson(`/api/runners/jobs/${encodeURIComponent(job.id)}/events`, {
        leaseToken,
        events: batch,
      });
      if (response?.canceled) {
        control.canceled = true;
        control.cancelReason = control.cancelReason || "Job was canceled";
      }
    } catch (error) {
      console.error("[runner] failed to send events:", error instanceof Error ? error.message : String(error));
    }
  };

  const queueEvent = (eventType, message, data = null, level = "info") => {
    eventBuffer.push({
      eventType,
      level,
      message: truncate(String(message || ""), 4000),
      data,
    });
  };

  let renewTimer = null;
  let heartbeatTimer = null;
  const renewLease = async () => {
    try {
      const response = await postJson(`/api/runners/jobs/${encodeURIComponent(job.id)}/renew`, {
        leaseToken,
        leaseSeconds: LEASE_SECONDS,
      });
      const renewedStatus = response?.job?.status ? String(response.job.status) : null;
      if (renewedStatus === "CANCELED") {
        control.canceled = true;
        control.cancelReason = "Job was canceled";
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/canceled/i.test(message)) {
        control.canceled = true;
        control.cancelReason = "Job was canceled";
      } else {
        queueEvent("runner.lease", `Lease renewal failed: ${message}`, null, "error");
      }
    }
  };
  const beginMaintenanceLoops = () => {
    const renewEveryMs = Math.max(5000, Math.floor((LEASE_SECONDS * 1000) / 2));
    renewTimer = setInterval(() => {
      void renewLease();
    }, renewEveryMs);
    heartbeatTimer = setInterval(() => {
      void heartbeat().catch((error) => {
        console.error("[runner] heartbeat during job failed:", error instanceof Error ? error.message : String(error));
      });
    }, HEARTBEAT_INTERVAL_MS);
  };
  const endMaintenanceLoops = () => {
    if (renewTimer) clearInterval(renewTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  };

  try {
    beginMaintenanceLoops();
    queueEvent("runner.info", "Runner started job execution", {
      jobType: job.jobType,
      title: job.title,
    });
    await flushEvents();
    if (control.canceled) throw new Error(control.cancelReason || "Job was canceled");

    let result;
    if (job.jobType === "health.check") {
      result = {
        ok: true,
        runnerTime: new Date().toISOString(),
        host: hostname(),
      };
      queueEvent("runner.health", "Health check completed");
      await flushEvents();
    } else if (job.jobType === "command.exec") {
      result = await executeCommandJob(job.payload || {}, queueEvent, flushEvents, control);
    } else if (job.jobType === "command.interactive") {
      result = await executeInteractiveCommandJob(job.payload || {}, queueEvent, flushEvents, control, {
        jobId: job.id,
        leaseToken,
      });
    } else if (job.jobType === "command.pty") {
      result = await executePtyCommandJob(job.payload || {}, queueEvent, flushEvents, control, {
        jobId: job.id,
        leaseToken,
      });
    } else if (job.jobType === "file.read") {
      if (control.canceled) throw new Error(control.cancelReason || "Job was canceled");
      result = await executeFileReadJob(job.payload || {}, queueEvent, flushEvents);
    } else if (job.jobType === "file.write") {
      if (control.canceled) throw new Error(control.cancelReason || "Job was canceled");
      result = await executeFileWriteJob(job.payload || {}, queueEvent, flushEvents);
    } else {
      throw new Error(`Unsupported jobType: ${job.jobType}`);
    }

    await flushEvents();
    endMaintenanceLoops();
    await postJson(`/api/runners/jobs/${encodeURIComponent(job.id)}/complete`, {
      leaseToken,
      ok: true,
      result,
    });
    console.log(`[runner] completed job ${job.id}`);
  } catch (error) {
    endMaintenanceLoops();
    queueEvent("runner.error", error instanceof Error ? error.message : String(error), null, "error");
    await flushEvents();
    await postJson(`/api/runners/jobs/${encodeURIComponent(job.id)}/complete`, {
      leaseToken,
      ok: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    }).catch((e) => {
      console.error("[runner] failed to report completion:", e instanceof Error ? e.message : String(e));
    });
    console.error(`[runner] failed job ${job.id}:`, error instanceof Error ? error.message : String(error));
  }
}

async function executeCommandJob(payload, queueEvent, flushEvents, control) {
  const parsed = normalizeCommandPayload(payload);
  validateCommandPayload(parsed);

  queueEvent("command.plan", "Prepared command execution", {
    cwd: parsed.cwd,
    command: [parsed.command, ...parsed.args],
    timeoutSeconds: parsed.timeoutSeconds,
  });
  await flushEvents();

  return await runSpawnedCommand(parsed, queueEvent, flushEvents, control);
}

async function executeInteractiveCommandJob(payload, queueEvent, flushEvents, control, jobRef) {
  const parsed = normalizeCommandPayload(payload);
  validateCommandPayload(parsed);

  queueEvent("command.interactive.plan", "Prepared interactive command execution", {
    cwd: parsed.cwd,
    command: [parsed.command, ...parsed.args],
    timeoutSeconds: parsed.timeoutSeconds,
  });
  await flushEvents();

  return await runInteractiveCommand(parsed, queueEvent, flushEvents, control, jobRef);
}

async function executePtyCommandJob(payload, queueEvent, flushEvents, control, jobRef) {
  const nodePty = await loadNodePty(true);
  const parsed = normalizeCommandPayload(payload);
  validateCommandPayload(parsed);
  const cols = clampInt(payload.cols, 100, 20, 400);
  const rows = clampInt(payload.rows, 30, 5, 200);
  queueEvent("command.pty.plan", "Prepared PTY command execution", {
    cwd: parsed.cwd,
    command: [parsed.command, ...parsed.args],
    timeoutSeconds: parsed.timeoutSeconds,
    cols,
    rows,
  });
  await flushEvents();
  return await runPtyCommand(nodePty, parsed, { cols, rows }, queueEvent, flushEvents, control, jobRef);
}

async function executeFileReadJob(payload, queueEvent, flushEvents) {
  const targetPath = validateFilePathPayload(payload, "path");
  const maxBytes = clampInt(payload.maxBytes, 128 * 1024, 1, 2 * 1024 * 1024);
  queueEvent("file.read.plan", "Prepared file read", { path: targetPath, maxBytes });
  await flushEvents();

  const fileInfo = await stat(targetPath).catch(() => null);
  if (!fileInfo) throw new Error(`File not found: ${targetPath}`);
  if (!fileInfo.isFile()) throw new Error(`Path is not a file: ${targetPath}`);

  const bytes = await readFile(targetPath);
  const truncated = bytes.byteLength > maxBytes;
  const slice = truncated ? bytes.subarray(0, maxBytes) : bytes;
  const text = tryDecodeUtf8(slice);

  queueEvent("file.read.result", "Read file", {
    path: targetPath,
    sizeBytes: fileInfo.size,
    returnedBytes: slice.byteLength,
    truncated,
    textDecoded: text !== null,
  });

  return {
    kind: "file.read.result",
    path: targetPath,
    sizeBytes: fileInfo.size,
    returnedBytes: slice.byteLength,
    truncated,
    encoding: text !== null ? "utf8" : "base64",
    content: text !== null ? text : slice.toString("base64"),
  };
}

async function executeFileWriteJob(payload, queueEvent, flushEvents) {
  const targetPath = validateFilePathPayload(payload, "path");
  const encoding = payload.encoding === "base64" ? "base64" : "utf8";
  const createDirs = payload.createDirs !== false;
  const overwrite = payload.overwrite !== false;
  const contentRaw = typeof payload.content === "string" ? payload.content : null;
  if (contentRaw == null) throw new Error("file.write requires string payload.content");

  let nextBytes;
  try {
    nextBytes = encoding === "base64" ? Buffer.from(contentRaw, "base64") : Buffer.from(contentRaw, "utf8");
  } catch {
    throw new Error("Invalid file.write content for selected encoding");
  }
  if (nextBytes.byteLength > 2 * 1024 * 1024) throw new Error("file.write content exceeds 2MB limit");

  const beforeBytes = await readFile(targetPath).catch(() => null);
  const existed = Boolean(beforeBytes);
  if (existed && !overwrite) throw new Error(`File exists and overwrite=false: ${targetPath}`);
  if (createDirs) await mkdir(path.dirname(targetPath), { recursive: true });

  const beforeText = beforeBytes ? tryDecodeUtf8(beforeBytes) : null;
  const afterText = tryDecodeUtf8(nextBytes);
  const diff = buildTextDiffSummary(beforeText, afterText);

  queueEvent("file.write.plan", "Prepared file write", {
    path: targetPath,
    existed,
    overwrite,
    createDirs,
    bytes: nextBytes.byteLength,
  });
  await flushEvents();

  await writeFile(targetPath, nextBytes);

  queueEvent("file.write.result", existed ? "Updated file" : "Created file", {
    path: targetPath,
    existed,
    bytesWritten: nextBytes.byteLength,
    textDiffAvailable: Boolean(diff),
  });

  return {
    kind: "file.write.result",
    path: targetPath,
    existed,
    bytesWritten: nextBytes.byteLength,
    encoding,
    changed: !beforeBytes || !Buffer.from(beforeBytes).equals(nextBytes),
    diffSummary: diff,
  };
}

function normalizeCommandPayload(payload) {
  const cwd = typeof payload.cwd === "string" ? payload.cwd : process.cwd();
  let command = "";
  let args = [];

  if (Array.isArray(payload.command) && payload.command.length > 0) {
    command = String(payload.command[0]);
    args = payload.command.slice(1).map((v) => String(v));
  } else if (typeof payload.command === "string" && payload.command.trim()) {
    throw new Error("String commands are not supported. Use payload.command as string[]");
  } else {
    throw new Error("Missing payload.command");
  }

  const env = isPlainObject(payload.env) ? payload.env : {};
  const timeoutSeconds = clampInt(payload.timeoutSeconds, DEFAULT_TIMEOUT_SECONDS, 5, 7200);

  return {
    cwd,
    command,
    args,
    env,
    timeoutSeconds,
  };
}

function validateFilePathPayload(payload, key) {
  const raw = typeof payload[key] === "string" ? payload[key] : "";
  if (!raw.trim()) throw new Error(`Missing payload.${key}`);
  const abs = path.resolve(raw);
  if (!isPathAllowed(abs)) throw new Error(`Path is outside allowlisted roots: ${abs}`);
  return abs;
}

function validateCommandPayload(input) {
  const absCwd = path.resolve(input.cwd);
  if (!isPathAllowed(absCwd)) {
    throw new Error(`cwd is outside allowlisted roots: ${absCwd}`);
  }
  const executable = path.basename(input.command);
  const effectivePolicy = getEffectiveExecutionPolicy();
  const effectiveAllowlist = effectivePolicy.allowedCommands;
  if (!effectiveAllowlist.includes(executable)) {
    throw new Error(`Command not allowed: ${executable}`);
  }
  validateCommandAgainstNetworkPolicy(executable, effectivePolicy.network);
}

async function runSpawnedCommand(input, queueEvent, flushEvents, control) {
  const startedAt = Date.now();
  const env = {
    ...process.env,
    ...sanitizeEnv(input.env),
  };

  return await new Promise((resolve, reject) => {
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";
    let stdoutTail = "";
    let stderrTail = "";
    let timedOut = false;
    let canceled = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      queueEvent("command.timeout", `Command exceeded timeout (${input.timeoutSeconds}s)`, {
        timeoutSeconds: input.timeoutSeconds,
      }, "error");
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, input.timeoutSeconds * 1000);
    const cancelPoll = setInterval(() => {
      if (!control?.canceled || canceled) return;
      canceled = true;
      queueEvent("command.canceled", control.cancelReason || "Command canceled by user", null, "error");
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, 500);

    const pushStreamChunk = (streamName, chunk) => {
      const text = chunk.toString("utf8");
      if (!text) return;
      const redacted = redactSecrets(text);
      if (streamName === "stdout") stdoutTail = (stdoutTail + redacted).slice(-32000);
      if (streamName === "stderr") stderrTail = (stderrTail + redacted).slice(-32000);

      const lines = redacted.split(/\r?\n/);
      for (const line of lines) {
        if (!line) continue;
        queueEvent(streamName, line);
      }
    };

    child.stdout?.on("data", (chunk) => {
      stdoutBuffer += chunk.toString("utf8");
      pushStreamChunk("stdout", chunk);
      if (stdoutBuffer.length > 8192) {
        stdoutBuffer = "";
        void flushEvents();
      }
    });

    child.stderr?.on("data", (chunk) => {
      stderrBuffer += chunk.toString("utf8");
      pushStreamChunk("stderr", chunk);
      if (stderrBuffer.length > 4096) {
        stderrBuffer = "";
        void flushEvents();
      }
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      clearInterval(cancelPoll);
      reject(error);
    });

    child.on("close", async (code, signal) => {
      clearTimeout(timeout);
      clearInterval(cancelPoll);
      const durationMs = Date.now() - startedAt;
      queueEvent("command.exit", `Command exited`, {
        code,
        signal,
        durationMs,
        timedOut,
      }, code === 0 && !timedOut ? "info" : "error");
      await flushEvents();

      if (timedOut) {
        reject(new Error(`Command timed out after ${input.timeoutSeconds}s`));
        return;
      }
      if (canceled || control?.canceled) {
        reject(new Error(control?.cancelReason || "Command canceled by user"));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Command exited with code ${code}${signal ? ` (signal ${signal})` : ""}`));
        return;
      }

      resolve({
        kind: "command.exec.result",
        command: [input.command, ...input.args],
        cwd: input.cwd,
        exitCode: code ?? 0,
        signal: signal ?? null,
        durationMs,
        stdoutTail: truncate(redactSecrets(stdoutTail), 32000),
        stderrTail: truncate(redactSecrets(stderrTail), 32000),
      });
    });
  });
}

async function runInteractiveCommand(input, queueEvent, flushEvents, control, jobRef) {
  const startedAt = Date.now();
  const env = {
    ...process.env,
    ...sanitizeEnv(input.env),
  };

  return await new Promise((resolve, reject) => {
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    let stdoutTail = "";
    let stderrTail = "";
    let timedOut = false;
    let canceled = false;
    let controlPollBusy = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      queueEvent("command.timeout", `Interactive command exceeded timeout (${input.timeoutSeconds}s)`, {
        timeoutSeconds: input.timeoutSeconds,
      }, "error");
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, input.timeoutSeconds * 1000);

    const pushStreamChunk = (streamName, chunk) => {
      const text = chunk.toString("utf8");
      if (!text) return;
      const redacted = redactSecrets(text);
      if (streamName === "stdout") stdoutTail = (stdoutTail + redacted).slice(-32000);
      if (streamName === "stderr") stderrTail = (stderrTail + redacted).slice(-32000);
      for (const line of redacted.split(/\r?\n/)) {
        if (!line) continue;
        queueEvent(streamName, line);
      }
    };

    const applyControlMessage = (message) => {
      const kind = String(message?.kind || "");
      const payload = isPlainObject(message?.payload) ? message.payload : {};
      if (kind === "stdin.line") {
        const text = typeof payload.text === "string" ? payload.text : "";
        child.stdin.write(`${text}\n`);
        queueEvent("stdin.applied", "Sent line to interactive command", { chars: text.length + 1 });
        return;
      }
      if (kind === "stdin.write") {
        const text = typeof payload.text === "string" ? payload.text : "";
        child.stdin.write(text);
        queueEvent("stdin.applied", "Sent input to interactive command", { chars: text.length });
        return;
      }
      if (kind === "signal") {
        const signalName = typeof payload.signal === "string" ? payload.signal : "SIGTERM";
        child.kill(signalName);
        queueEvent("signal.applied", "Sent signal to interactive command", { signal: signalName });
      }
    };

    const pollControls = async () => {
      if (controlPollBusy || canceled || control?.canceled) return;
      controlPollBusy = true;
      try {
        const response = await postJson(`/api/runners/jobs/${encodeURIComponent(jobRef.jobId)}/control/poll`, {
          leaseToken: jobRef.leaseToken,
          limit: 20,
        });
        if (response?.canceled) {
          control.canceled = true;
          control.cancelReason = "Job was canceled";
          canceled = true;
          child.kill("SIGTERM");
          setTimeout(() => child.kill("SIGKILL"), 5000);
          return;
        }
        const controls = Array.isArray(response?.controls) ? response.controls : [];
        for (const message of controls) {
          applyControlMessage(message);
        }
        if (controls.length > 0) {
          void flushEvents();
        }
      } catch (error) {
        queueEvent("control.poll.error", error instanceof Error ? error.message : String(error), null, "error");
      } finally {
        controlPollBusy = false;
      }
    };

    const controlPollInterval = setInterval(() => {
      void pollControls();
    }, 250);

    child.stdout?.on("data", (chunk) => {
      pushStreamChunk("stdout", chunk);
      void flushEvents();
    });

    child.stderr?.on("data", (chunk) => {
      pushStreamChunk("stderr", chunk);
      void flushEvents();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      clearInterval(controlPollInterval);
      reject(error);
    });

    child.on("close", async (code, signal) => {
      clearTimeout(timeout);
      clearInterval(controlPollInterval);
      const durationMs = Date.now() - startedAt;
      queueEvent("command.exit", "Interactive command exited", {
        code,
        signal,
        durationMs,
        timedOut,
      }, code === 0 && !timedOut && !canceled ? "info" : "error");
      await flushEvents();

      if (timedOut) {
        reject(new Error(`Interactive command timed out after ${input.timeoutSeconds}s`));
        return;
      }
      if (canceled || control?.canceled) {
        reject(new Error(control?.cancelReason || "Interactive command canceled by user"));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Interactive command exited with code ${code}${signal ? ` (signal ${signal})` : ""}`));
        return;
      }

      resolve({
        kind: "command.interactive.result",
        command: [input.command, ...input.args],
        cwd: input.cwd,
        exitCode: code ?? 0,
        signal: signal ?? null,
        durationMs,
        stdoutTail: truncate(redactSecrets(stdoutTail), 32000),
        stderrTail: truncate(redactSecrets(stderrTail), 32000),
      });
    });
  });
}

async function runPtyCommand(nodePty, input, termSize, queueEvent, flushEvents, control, jobRef) {
  const startedAt = Date.now();
  const env = {
    ...process.env,
    ...sanitizeEnv(input.env),
  };

  return await new Promise((resolve, reject) => {
    const ptyProc = nodePty.spawn(input.command, input.args, {
      name: process.env.TERM || "xterm-256color",
      cols: termSize.cols,
      rows: termSize.rows,
      cwd: input.cwd,
      env,
    });

    let stdoutTail = "";
    let timedOut = false;
    let canceled = false;
    let controlPollBusy = false;
    let exitSeen = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      queueEvent("command.timeout", `PTY command exceeded timeout (${input.timeoutSeconds}s)`, { timeoutSeconds: input.timeoutSeconds }, "error");
      try {
        ptyProc.kill("SIGTERM");
      } catch {}
      setTimeout(() => {
        try {
          ptyProc.kill("SIGKILL");
        } catch {}
      }, 5000);
    }, input.timeoutSeconds * 1000);

    const pushPtyChunk = (text) => {
      if (!text) return;
      const redacted = redactSecrets(String(text));
      queueEvent("pty.data", "PTY output chunk", {
        chunk: truncate(redacted, 4000),
      });
      stdoutTail = (stdoutTail + redacted).slice(-32000);
      for (const line of redacted.split(/\r?\n/)) {
        if (!line) continue;
        queueEvent("stdout", line);
      }
    };

    const applyControlMessage = (message) => {
      const kind = String(message?.kind || "");
      const payload = isPlainObject(message?.payload) ? message.payload : {};
      if (kind === "stdin.line") {
        const text = typeof payload.text === "string" ? payload.text : "";
        ptyProc.write(`${text}\r`);
        queueEvent("stdin.applied", "Sent line to PTY command", { chars: text.length + 1 });
        return;
      }
      if (kind === "stdin.write") {
        const text = typeof payload.text === "string" ? payload.text : "";
        ptyProc.write(text);
        queueEvent("stdin.applied", "Sent input to PTY command", { chars: text.length });
        return;
      }
      if (kind === "resize") {
        const cols = clampInt(payload.cols, termSize.cols, 20, 400);
        const rows = clampInt(payload.rows, termSize.rows, 5, 200);
        termSize.cols = cols;
        termSize.rows = rows;
        try {
          ptyProc.resize(cols, rows);
          queueEvent("pty.resize", "Resized PTY", { cols, rows });
        } catch (error) {
          queueEvent("pty.resize.error", error instanceof Error ? error.message : String(error), { cols, rows }, "error");
        }
        return;
      }
      if (kind === "signal") {
        const signalName = typeof payload.signal === "string" ? payload.signal : "SIGTERM";
        try {
          ptyProc.kill(signalName);
        } catch {}
        queueEvent("signal.applied", "Sent signal to PTY command", { signal: signalName });
      }
    };

    const pollControls = async () => {
      if (controlPollBusy || canceled || control?.canceled || exitSeen) return;
      controlPollBusy = true;
      try {
        const response = await postJson(`/api/runners/jobs/${encodeURIComponent(jobRef.jobId)}/control/poll`, {
          leaseToken: jobRef.leaseToken,
          limit: 20,
        });
        if (response?.canceled) {
          control.canceled = true;
          control.cancelReason = "Job was canceled";
          canceled = true;
          try {
            ptyProc.kill("SIGTERM");
          } catch {}
          return;
        }
        const controls = Array.isArray(response?.controls) ? response.controls : [];
        for (const message of controls) applyControlMessage(message);
        if (controls.length) void flushEvents();
      } catch (error) {
        queueEvent("control.poll.error", error instanceof Error ? error.message : String(error), null, "error");
      } finally {
        controlPollBusy = false;
      }
    };

    const controlPollInterval = setInterval(() => {
      void pollControls();
    }, 250);

    ptyProc.onData((data) => {
      pushPtyChunk(data);
      void flushEvents();
    });

    ptyProc.onExit(async ({ exitCode, signal }) => {
      exitSeen = true;
      clearTimeout(timeout);
      clearInterval(controlPollInterval);
      const durationMs = Date.now() - startedAt;
      queueEvent("command.exit", "PTY command exited", { code: exitCode, signal, durationMs, timedOut }, exitCode === 0 && !timedOut && !canceled ? "info" : "error");
      await flushEvents();

      if (timedOut) {
        reject(new Error(`PTY command timed out after ${input.timeoutSeconds}s`));
        return;
      }
      if (canceled || control?.canceled) {
        reject(new Error(control?.cancelReason || "PTY command canceled by user"));
        return;
      }
      if (exitCode !== 0) {
        reject(new Error(`PTY command exited with code ${exitCode}${signal ? ` (signal ${signal})` : ""}`));
        return;
      }

      resolve({
        kind: "command.pty.result",
        command: [input.command, ...input.args],
        cwd: input.cwd,
        exitCode,
        signal: signal ?? null,
        durationMs,
        stdoutTail: truncate(redactSecrets(stdoutTail), 32000),
        stderrTail: "",
        pty: { cols: termSize.cols, rows: termSize.rows },
      });
    });
  });
}

async function apiFetch(routePath, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("authorization", `Bearer ${AUTH_TOKEN}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(`${BASE_URL}${routePath}`, {
    ...init,
    headers,
  });
}

async function postJson(routePath, body) {
  const res = await apiFetch(routePath, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${routePath} failed (${res.status}): ${text}`);
  }
  return res.json().catch(() => ({}));
}

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parsePathList(value) {
  if (!value) return [];
  return String(value)
    .split(process.platform === "win32" ? ";" : /[:,]/)
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => path.resolve(v));
}

function isPathAllowed(candidatePath) {
  const normalized = path.resolve(candidatePath);
  return getEffectiveExecutionPolicy().allowedRoots.some((root) => {
    const rel = path.relative(root, normalized);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  });
}

function getEffectiveExecutionPolicy() {
  const rules = isPlainObject(serverPolicy?.rules) ? serverPolicy.rules : {};
  const execution = isPlainObject(rules.execution) ? rules.execution : {};
  const serverAllowedRoots = Array.isArray(execution.allowedRoots)
    ? execution.allowedRoots.map((v) => path.resolve(String(v))).filter(Boolean)
    : [];
  const envRoots = ALLOWED_ROOTS;
  const allowedRoots = serverAllowedRoots.length
    ? envRoots.filter((envRoot) => serverAllowedRoots.some((serverRoot) => pathMatchesRoot(envRoot, serverRoot) || pathMatchesRoot(serverRoot, envRoot)))
    : envRoots;

  const baseCommands = (ALLOWED_COMMANDS.length ? ALLOWED_COMMANDS : DEFAULT_ALLOWED_COMMANDS).map((c) => String(c));
  const serverAllowedCommands = Array.isArray(execution.allowedCommands)
    ? execution.allowedCommands.map((c) => String(c).trim()).filter(Boolean)
    : [];
  const allowedCommands = serverAllowedCommands.length
    ? baseCommands.filter((cmd) => serverAllowedCommands.includes(cmd))
    : baseCommands;

  const networkRaw = isPlainObject(execution.network) ? execution.network : {};
  const mode = networkRaw.mode === "deny_all" || networkRaw.mode === "allowlist" ? networkRaw.mode : "allow_all";
  const allowDomains = Array.isArray(networkRaw.allowDomains)
    ? networkRaw.allowDomains.map((d) => String(d).trim().toLowerCase()).filter(Boolean)
    : [];

  return {
    allowedRoots,
    allowedCommands,
    network: { mode, allowDomains },
  };
}

function pathMatchesRoot(candidatePath, rootPath) {
  const rel = path.relative(path.resolve(rootPath), path.resolve(candidatePath));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function validateCommandAgainstNetworkPolicy(executable, networkPolicy) {
  if (!networkPolicy || networkPolicy.mode === "allow_all") return;
  if (NETWORK_HEAVY_COMMANDS.has(executable)) {
    throw new Error(`Command blocked by network policy (${networkPolicy.mode}): ${executable}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampInt(input, fallback, min, max) {
  const n = Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function loadNodePty(required) {
  if (cachedNodePty !== undefined) return cachedNodePty;
  try {
    cachedNodePty = await import("node-pty");
    return cachedNodePty;
  } catch (error) {
    cachedNodePty = null;
    if (required) {
      throw new Error(`node-pty is not installed. Install it to use command.pty jobs. (${error instanceof Error ? error.message : String(error)})`);
    }
    return null;
  }
}

function sanitizeEnv(envPatch) {
  const out = {};
  for (const [key, value] of Object.entries(envPatch)) {
    if (!/^[A-Z0-9_]+$/i.test(key)) continue;
    out[key] = String(value);
  }
  return out;
}

function tryDecodeUtf8(bytes) {
  try {
    const text = Buffer.from(bytes).toString("utf8");
    // reject obvious binary-ish content
    const nulCount = (text.match(/\u0000/g) || []).length;
    if (nulCount > 0) return null;
    return text;
  } catch {
    return null;
  }
}

function buildTextDiffSummary(beforeText, afterText) {
  if (beforeText == null || afterText == null) return null;
  if (beforeText === afterText) {
    return { changed: false, added: 0, removed: 0, preview: [] };
  }
  const beforeLines = beforeText.split(/\r?\n/);
  const afterLines = afterText.split(/\r?\n/);
  let i = 0;
  let j = 0;
  let added = 0;
  let removed = 0;
  const preview = [];

  while ((i < beforeLines.length || j < afterLines.length) && preview.length < 40) {
    const a = beforeLines[i];
    const b = afterLines[j];
    if (a === b) {
      i += 1;
      j += 1;
      continue;
    }
    if (j < afterLines.length && (i >= beforeLines.length || beforeLines[i + 1] === b)) {
      added += 1;
      preview.push(`+ ${truncate(b ?? "", 240)}`);
      j += 1;
      continue;
    }
    if (i < beforeLines.length && (j >= afterLines.length || afterLines[j + 1] === a)) {
      removed += 1;
      preview.push(`- ${truncate(a ?? "", 240)}`);
      i += 1;
      continue;
    }
    if (i < beforeLines.length) {
      removed += 1;
      preview.push(`- ${truncate(a ?? "", 240)}`);
      i += 1;
    }
    if (j < afterLines.length && preview.length < 40) {
      added += 1;
      preview.push(`+ ${truncate(b ?? "", 240)}`);
      j += 1;
    }
  }

  return { changed: true, added, removed, preview };
}

function redactSecrets(text) {
  return text
    .replace(/(sk-[a-zA-Z0-9_-]{10,})/g, "[REDACTED_API_KEY]")
    .replace(/(Bearer\s+)[A-Za-z0-9._-]{10,}/gi, "$1[REDACTED]");
}
