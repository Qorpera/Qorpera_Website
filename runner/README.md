# Zygenic Local Runner (Prototype)

This is the first local/on-prem runner daemon for Zygenic.

It connects to the web app control plane and executes leased jobs locally.

## Current Capabilities

- Heartbeat to cloud control plane
- Poll/lease runner jobs
- Execute `command.exec` jobs (array form only)
- Execute `file.read` jobs
- Execute `file.write` jobs with text diff summary
- Stream stdout/stderr as job events
- Report completion/failure
- Enforce allowlisted working directories
- Enforce command allowlist

## Requirements

- Node.js 18+ (for built-in `fetch`)
- A runner registration token from `POST /api/runners`
- Prisma migration + generate already run in the web app (for runner tables)

## Environment Variables

- `WF_RUNNER_BASE_URL` (required): e.g. `http://localhost:3000`
- `WF_RUNNER_TOKEN` (required): bearer token returned from runner registration
- `WF_RUNNER_ALLOWED_ROOTS` (required): absolute paths (comma/colon separated on unix, `;` on Windows)
- `WF_RUNNER_ALLOWED_COMMANDS` (optional): comma-separated executables
- `WF_RUNNER_NAME` (optional)
- `WF_RUNNER_LABEL` (optional)
- `WF_RUNNER_ENVIRONMENT` (optional): `desktop` | `server` | custom
- `WF_RUNNER_POLL_INTERVAL_MS` (optional)
- `WF_RUNNER_HEARTBEAT_INTERVAL_MS` (optional)
- `WF_RUNNER_LEASE_SECONDS` (optional)
- `WF_RUNNER_DEFAULT_TIMEOUT_SECONDS` (optional)

## Start

```bash
node runner/daemon.mjs
```

## Example Job Payload (`command.exec`)

Enqueue via `POST /api/runners/jobs`:

```json
{
  "title": "List project files",
  "jobType": "command.exec",
  "riskLevel": "low",
  "approvalRequired": false,
  "payload": {
    "cwd": "/absolute/path/to/project",
    "command": ["ls", "-la"],
    "timeoutSeconds": 30
  }
}
```

## Example Job Payload (`file.read`)

```json
{
  "title": "Read SOP",
  "jobType": "file.read",
  "riskLevel": "low",
  "approvalRequired": false,
  "payload": {
    "path": "/absolute/path/to/workspace/docs/sop.md",
    "maxBytes": 65536
  }
}
```

## Example Job Payload (`file.write`)

```json
{
  "title": "Update template",
  "jobType": "file.write",
  "riskLevel": "medium",
  "approvalRequired": true,
  "payload": {
    "path": "/absolute/path/to/workspace/templates/outreach.txt",
    "content": "Hello {{name}}\\n\\nThanks for your time...\\n",
    "encoding": "utf8",
    "overwrite": true,
    "createDirs": true
  }
}
```

## Safety Notes

- String shell commands are intentionally rejected. Use `command` as `string[]`.
- The runner only validates `cwd` against allowlisted roots in this prototype.
- `file.read`/`file.write` validate `path` against the same allowlisted roots.
- Command arguments are not policy-filtered yet (next phase).
- PTY support, file read/write APIs, and websocket streaming are not implemented yet.
