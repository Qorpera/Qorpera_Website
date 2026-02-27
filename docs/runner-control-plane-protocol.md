# Runner Control Plane Protocol (v1 Draft)

This document describes the cloud-side API surface implemented in qorpera for the first runner integration pass.

## User / Web App Endpoints (session-authenticated)

### `GET /api/runners`

Returns registered runners for the logged-in user.

### `POST /api/runners`

Registers a runner and returns a one-time auth token to install into the local runner config.

Request JSON:

```json
{
  "name": "Office Mac Mini",
  "environment": "server",
  "label": "HQ rack runner"
}
```

Response JSON:

```json
{
  "ok": true,
  "registration": {
    "runner": { "id": "c...", "name": "Office Mac Mini", "status": "PENDING" },
    "authToken": "wfr_..."
  }
}
```

### `GET /api/runners/jobs`

Returns recent runner jobs for the logged-in user.

### `POST /api/runners/jobs`

Enqueues a runner job.

Request JSON:

```json
{
  "title": "Deploy website",
  "jobType": "command.exec",
  "riskLevel": "high",
  "approvalRequired": true,
  "payload": {
    "cwd": "/work/projects/site",
    "command": ["npm", "run", "build"]
  }
}
```

### `PATCH /api/runners/jobs`

Approves a queued approval-gated job.

Request JSON:

```json
{ "id": "job_cuid", "action": "approve" }
```

### `GET /api/runners/jobs/:id/events`

Reads streamed/stored events for a runner job.

## Runner Endpoints (Bearer token authenticated)

Runner sends `Authorization: Bearer wfr_...`

### `POST /api/runners/heartbeat`

Updates runner liveness, host metadata, version, and capabilities.

Request JSON:

```json
{
  "hostName": "macmini-hq",
  "osName": "macOS",
  "runnerVersion": "0.1.0",
  "capabilities": {
    "shell": true,
    "pty": true,
    "files": true,
    "docker": true
  }
}
```

### `POST /api/runners/jobs/poll`

Leases available jobs and returns per-job lease tokens.

Request JSON:

```json
{ "limit": 3, "leaseSeconds": 120 }
```

Response (excerpt):

```json
{
  "ok": true,
  "jobs": [
    {
      "id": "job_cuid",
      "status": "LEASED",
      "payload": { "cwd": "/work/projects/site", "command": ["npm", "run", "build"] },
      "leaseToken": "..."
    }
  ]
}
```

### `POST /api/runners/jobs/:id/start`

Transitions a leased job into `RUNNING`.

Request JSON:

```json
{ "leaseToken": "..." }
```

### `POST /api/runners/jobs/:id/events`

Appends log/progress events for a running job.

Request JSON:

```json
{
  "leaseToken": "...",
  "events": [
    { "eventType": "stdout", "level": "info", "message": "Installing dependencies..." },
    { "eventType": "progress", "level": "info", "message": "50%", "data": { "percent": 50 } }
  ]
}
```

### `POST /api/runners/jobs/:id/complete`

Completes the job as success/failure and stores structured result payload.

Request JSON:

```json
{
  "leaseToken": "...",
  "ok": true,
  "result": {
    "exitCode": 0,
    "artifacts": ["dist/index.html"]
  }
}
```

## Notes

- This is the control-plane foundation only.
- No websocket streaming is implemented yet.
- Lease renewal endpoint exists in server lib but is not exposed yet.
- Runner-side execution currently supports:
  - `health.check`
  - `command.exec`
  - `file.read`
  - `file.write`

## Additional Job Payload Examples

### `file.read`

```json
{
  "title": "Read pricing config",
  "jobType": "file.read",
  "riskLevel": "low",
  "approvalRequired": false,
  "payload": {
    "path": "/absolute/path/to/project/config/pricing.json",
    "maxBytes": 65536
  }
}
```

### `file.write`

```json
{
  "title": "Update outreach template",
  "jobType": "file.write",
  "riskLevel": "medium",
  "approvalRequired": true,
  "payload": {
    "path": "/absolute/path/to/project/templates/outreach.txt",
    "content": "Hello {{name}},\n\nThanks for your time...\n",
    "encoding": "utf8",
    "overwrite": true,
    "createDirs": true
  }
}
```

`file.write` results include a text diff summary (added/removed counts + preview) when both before/after content are UTF-8 text.
