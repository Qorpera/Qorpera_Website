# Zygenic Runner Architecture (Business-Friendly OpenClaw Model)

## Goal

Deliver OpenClaw-style local execution power (filesystem, shell, tools, long-running jobs) inside a non-technical, business-friendly web UX with approvals, audit logs, and policy controls.

## Product Split

1. Web App (Cloud Mission Control)
   - task templates
   - chat + approvals + activity feed
   - org/users/teams/RBAC
   - audit logs and billing
   - shared business memory and integrations

2. Agent Runner (Local / On-Prem)
   - sandboxed shell command execution
   - allowlisted filesystem access
   - local tools (`git`, `npm`, `docker`, `prisma`, etc.)
   - long-running process/job supervision
   - log and artifact streaming
   - policy enforcement before side effects

3. Secure Outbound Connection
   - runner initiates outbound websocket/SSE connection to cloud
   - no inbound port opening required
   - cloud queues jobs, runner executes locally, runner streams results

## Trust Model

- Cloud UI is "mission control"
- Runner is "hands on keyboard"
- Filesystem remains source of truth by default
- Website does not need all files uploaded to execute work

## Filesystem Model (Default)

Recommended default: `Filesystem is source of truth`

- runner reads/writes directly in allowlisted roots
- web UI receives metadata, diffs, logs, artifacts, and summaries
- optional future feature: workspace sync / managed artifact storage for replayability

## Runner v1 API Surface (Local Process)

The runner owns these capabilities behind policy checks:

- `POST /v1/jobs/execute`
  - execute one approved job step
- `POST /v1/commands/start`
  - start command in PTY/sandbox
- `POST /v1/commands/{id}/stdin`
  - write to PTY
- `GET /v1/commands/{id}/stream`
  - stream stdout/stderr/status
- `POST /v1/files/read`
  - read file (bounded size)
- `POST /v1/files/write`
  - write file (with diff capture)
- `POST /v1/files/list`
  - list directories within allowlisted roots
- `POST /v1/tools/run`
  - invoke approved tool adapters
- `GET /v1/health`
  - runner health and capability status

## Security / Policy (Must-Have)

### Filesystem

- allowlisted roots only
- per-run working directory
- denylist dangerous paths (`/`, `/etc`, SSH keys, cloud creds, etc.)
- max read/write size limits

### Commands

- command policy tiers:
  - `auto`: safe reads / lint / status
  - `approval`: installs, writes, migrations, deploys
  - `blocked`: destructive or disallowed actions
- normalized command logging (argv, cwd, env redaction)
- optional command allowlist templates by department

### Network

- egress allowlist / denylist
- block private/internal metadata endpoints by default
- log outbound domains for audits

### Secrets

- vault-backed secret injection (or runner-local secret store)
- redact secrets in logs/traces
- no raw secret echo in UI or persisted traces

## Approval UX (Non-Technical Friendly)

Risk tiers should map to plain language:

- Low risk (auto)
  - read files, gather context, draft content
- Medium risk (approval)
  - write files, create PRs, modify docs/spreadsheets
- High risk (approval + extra confirmation)
  - production commands, payments, customer sends, DB writes, deploys

Approval cards must show:

- what is about to happen
- why it is needed
- exact changes / command / recipients
- rollback path if available

## Agent Loop Contract (Planner / Worker / Reviewer)

This follows the bounded loop rules in `agent-loop-orchestration`.

- `goal`: complete a single business task safely with auditability
- `loop_kind`: `planner-worker-reviewer`
- `state`:
  - `run_id`
  - `job_id`
  - `iteration`
  - `plan_steps`
  - `artifacts`
  - `diffs`
  - `approvals_required`
  - `budgets_remaining`
  - `termination_reason`
- `step_input`:
  - task intent
  - available tools
  - policy limits
  - prior outputs/diffs
  - remaining budget
- `step_output` (structured JSON):
  - `summary`
  - `artifacts`
  - `proposed_actions`
  - `confidence`
  - `next_action` (`continue|retry|request_approval|escalate_human|done|abort`)
- `stop_conditions`:
  - success
  - human approval required
  - max iterations
  - runtime budget exceeded
  - repeated tool/schema failures
- `budget_limits`:
  - max iterations
  - max runtime
  - max tool calls
  - max external actions
- `risk_controls`:
  - approval gates for side effects
  - tool allowlist
  - idempotency keys for external actions
- `observability`:
  - per-step traces
  - tool call logs
  - diffs
  - policy decisions
  - termination reason
- `escalation`:
  - human review on low confidence or repeated failures

## Fastest Path (What To Build First)

1. Runner registration + secure outbound connection
2. Sandboxed command execution + log streaming
3. File read/write with diff capture
4. Web approval cards for command/file-write actions
5. One task template category (e.g. "Business docs + outreach drafts")
6. Planner/worker/reviewer bounded loop with explicit budgets

## Department Permission Templates (Initial)

- Marketing Workspace
  - docs/sheets/files/browser/http
  - email/meta require approval
- Finance Workspace
  - files/sheets/excel/word
  - no outbound email/payment execution by default
- Sales Ops Workspace
  - files/docs/sheets/crm/email
  - CRM writes + sends require approval
- Engineering Workspace
  - git/npm/docker/prisma/files
  - migrations/deploys require approval

## How This Maps To Current Repo

Current app already has a strong foundation for:

- approvals (`Review` / inbox)
- audit logs
- company memory (`Company Soul`, `Business Logs`, files)
- model routing
- bounded delegated loops (prototype level)

Next major milestone is to replace simulated connector execution with runner-backed execution under policy.
