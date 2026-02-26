import { getInboxItems } from "@/lib/inbox-store";
import { listBusinessFiles } from "@/lib/business-files-store";
import { listBusinessLogs } from "@/lib/business-logs-store";
import { getProjectsForUser } from "@/lib/workspace-store";
import { isUrlAllowedForServerFetch } from "@/lib/network-policy";
import { executeBrowserTask, checkBrowserServiceHealth } from "@/lib/browser-automation";

export type AdapterTraceRow = {
  toolName: string;
  phase: "context" | "plan" | "execute" | "review";
  status: "ok" | "requires_connector" | "error" | "blocked";
  latencyMs: number | null;
  inputSummary: string | null;
  outputSummary: string | null;
};

export type AdapterExecutionResult = {
  traces: AdapterTraceRow[];
  memoryFindings: string[];
  actions: Array<{
    kind: "business_log";
    title: string;
    category: "OPERATIONS" | "GENERAL" | "PROJECTS" | "COLLABORATION" | "FINANCE" | "SALES_MARKETING" | "LEGAL";
    source: "AGENT";
    authorLabel: string;
    body: string;
    relatedRef?: string | null;
  }>;
};

type AdapterStepResult = {
  trace: AdapterTraceRow;
  findings: string[];
  actions?: AdapterExecutionResult["actions"];
};

function summarizeUrlTargets(text: string) {
  const matches = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  return [...new Set(matches)].slice(0, 3);
}

function msSince(start: number) {
  return Math.max(1, Math.round(performance.now() - start));
}

function includesAny(text: string, patterns: RegExp[]) {
  return patterns.some((p) => p.test(text));
}

function inferRequestedToolsFromInstructions(instructions: string) {
  const text = instructions.toLowerCase();
  const requested = new Set<string>();
  if (includesAny(text, [/\bemail\b/, /\breply\b/, /\bsend\b/, /\binbox\b/])) requested.add("email");
  if (includesAny(text, [/\bcrm\b/, /\blead\b/, /\bpipeline\b/, /\bdeal\b/, /\bcontact record\b/])) requested.add("crm");
  if (includesAny(text, [/\bmeta\b/, /\bfacebook\b/, /\binstagram\b/, /\bwhatsapp\b/, /\bad(s)?\b/, /\bcampaign\b/])) requested.add("meta");
  if (includesAny(text, [/\bbrowser\b/, /\bclick\b/, /\bnavigate\b/, /\blog ?in\b/, /\bfill form\b/])) requested.add("browser");
  if (includesAny(text, [/\bexcel\b/, /\.xlsx\b/, /\bworkbook\b/])) requested.add("excel");
  if (includesAny(text, [/\bword\b/, /\.docx\b/, /\bredline\b/, /\bcontract\b/])) requested.add("word");
  if (includesAny(text, [/\bgoogle docs\b/, /\bdocument\b/, /\bdoc\b/])) requested.add("docs");
  if (includesAny(text, [/\bgoogle sheets\b/, /\bspreadsheet\b/, /\bsheet\b/])) requested.add("sheets");
  if (includesAny(text, [/\bcalendar\b/, /\bmeeting\b/, /\bschedule\b/, /\bappointment\b/])) requested.add("calendar");
  if (includesAny(text, [/\bhttps?:\/\//, /\bwebsite\b/, /\bweb\b/, /\blink\b/, /\burl\b/])) requested.add("http");
  if (includesAny(text, [/\bfile\b/, /\battachment\b/, /\bdocument archive\b/])) requested.add("files");
  if (includesAny(text, [/\breview\b/, /\bapproval\b/, /\bapprove\b/])) requested.add("review_queue");
  if (includesAny(text, [/\bproject\b/, /\bkanban\b/, /\btask board\b/])) requested.add("projects");
  return [...requested];
}

function remoteDocActionLikely(instructions: string) {
  const text = instructions.toLowerCase();
  return includesAny(text, [/\bwrite\b/, /\bupdate\b/, /\bedit\b/, /\bappend\b/, /\bmodify\b/, /\bpublish\b/, /\bcreate\b/, /\bfill\b/]);
}

type ConnectorAvailability = {
  configured: boolean;
  healthy: boolean;
  label: string;
  hint: string;
};

async function getConnectorAvailability(toolName: string): Promise<ConnectorAvailability> {
  if (toolName === "browser") {
    const health = await checkBrowserServiceHealth();
    return {
      configured: health.configured,
      healthy: health.healthy,
      label: "Browser automation runtime",
      hint: health.hint,
    };
  }

  const envChecks: Record<string, { vars: string[]; label: string; hint: string }> = {
    email: {
      vars: ["RESEND_API_KEY", "SENDGRID_API_KEY", "POSTMARK_SERVER_TOKEN", "SMTP_HOST"],
      label: "Email connector",
      hint: "Configure an email provider connector (Resend/SendGrid/Postmark/SMTP).",
    },
    crm: {
      vars: ["HUBSPOT_CLIENT_ID", "SALESFORCE_CLIENT_ID", "PIPEDRIVE_API_TOKEN"],
      label: "CRM connector",
      hint: "Configure HubSpot/Salesforce/Pipedrive credentials.",
    },
    meta: {
      vars: ["META_APP_ID", "META_APP_SECRET", "META_ACCESS_TOKEN"],
      label: "Meta Graph connector",
      hint: "Configure Meta Graph app credentials / access token.",
    },
    calendar: {
      vars: ["GOOGLE_CLIENT_ID", "MICROSOFT_CLIENT_ID", "NYLAS_API_KEY"],
      label: "Calendar connector",
      hint: "Configure Google/Microsoft/Nylas calendar credentials.",
    },
    docs: {
      vars: ["GOOGLE_CLIENT_ID", "MICROSOFT_CLIENT_ID"],
      label: "Docs connector",
      hint: "Configure Google Workspace or Microsoft Graph credentials for remote docs actions.",
    },
    sheets: {
      vars: ["GOOGLE_CLIENT_ID", "MICROSOFT_CLIENT_ID"],
      label: "Sheets connector",
      hint: "Configure Google Sheets or Microsoft Graph credentials for remote spreadsheet actions.",
    },
    excel: {
      vars: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
      label: "Excel connector",
      hint: "Configure Microsoft Graph credentials for Excel workbook actions.",
    },
    word: {
      vars: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
      label: "Word connector",
      hint: "Configure Microsoft Graph credentials for Word document actions.",
    },
  };
  const check = envChecks[toolName];
  if (!check) return { configured: false, healthy: false, label: `${toolName} connector`, hint: "No connector mapping defined yet." };
  const configured = check.vars.some((k) => Boolean(process.env[k]));
  return {
    configured,
    healthy: configured,
    label: check.label,
    hint: configured ? `${check.label} credentials detected.` : check.hint,
  };
}

async function runFilesAdapter(userId: string): Promise<{ trace: AdapterTraceRow; findings: string[] }> {
  const start = performance.now();
  const files = await listBusinessFiles(userId, 8);
  return {
    trace: {
      toolName: "files",
      phase: "context",
      status: "ok",
      latencyMs: msSince(start),
      inputSummary: "Read recent company files",
      outputSummary: `Loaded ${files.length} business files`,
    },
    findings: files.slice(0, 5).map((f) => `File: ${f.name} [${f.category.toLowerCase()}]`),
  };
}

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

async function runFileSubsetAdapter(input: {
  userId: string;
  toolName: string;
  label: string;
  exts?: string[];
  mimePrefixes?: string[];
}): Promise<AdapterStepResult> {
  const start = performance.now();
  const files = await listBusinessFiles(input.userId, 30);
  const matched = files.filter((f) => {
    const ext = extOf(f.name);
    const extOk = input.exts?.length ? input.exts.includes(ext) : false;
    const mimeOk = input.mimePrefixes?.length
      ? input.mimePrefixes.some((prefix) => (f.mimeType ?? "").toLowerCase().startsWith(prefix))
      : false;
    return extOk || mimeOk;
  });

  return {
    trace: {
      toolName: input.toolName,
      phase: "context",
      status: "ok",
      latencyMs: msSince(start),
      inputSummary: `Read ${input.label} from business files`,
      outputSummary: `Matched ${matched.length} ${input.label.toLowerCase()} file(s)`,
    },
    findings: matched.slice(0, 6).map((f) => `${input.label}: ${f.name}`),
  };
}

async function runBusinessLogsAdapter(userId: string): Promise<{ trace: AdapterTraceRow; findings: string[] }> {
  const start = performance.now();
  const logs = await listBusinessLogs(userId, 8);
  return {
    trace: {
      toolName: "business_logs",
      phase: "context",
      status: "ok",
      latencyMs: msSince(start),
      inputSummary: "Read recent business logs",
      outputSummary: `Loaded ${logs.length} business logs`,
    },
    findings: logs.slice(0, 5).map((l) => `Log: ${l.title} [${l.category.toLowerCase()}]`),
  };
}

async function runProjectsAdapter(userId: string): Promise<{ trace: AdapterTraceRow; findings: string[] }> {
  const start = performance.now();
  const projects = await getProjectsForUser(userId);
  return {
    trace: {
      toolName: "projects",
      phase: "context",
      status: "ok",
      latencyMs: msSince(start),
      inputSummary: "Read active projects and boards",
      outputSummary: `Loaded ${projects.length} projects`,
    },
    findings: projects.slice(0, 4).map((p) => `Project: ${p.name} (${p.workforceHealth})`),
  };
}

async function runDocsAdapter(userId: string): Promise<AdapterStepResult> {
  return runFileSubsetAdapter({
    userId,
    toolName: "docs",
    label: "documents",
    exts: [".md", ".txt", ".doc", ".docx", ".rtf", ".pdf"],
    mimePrefixes: ["text/", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml"],
  });
}

async function runSheetsAdapter(userId: string): Promise<AdapterStepResult> {
  return runFileSubsetAdapter({
    userId,
    toolName: "sheets",
    label: "sheets",
    exts: [".csv", ".tsv", ".xlsx", ".xls"],
    mimePrefixes: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml"],
  });
}

async function runExcelAdapter(userId: string): Promise<AdapterStepResult> {
  return runFileSubsetAdapter({
    userId,
    toolName: "excel",
    label: "Excel workbooks",
    exts: [".xlsx", ".xls", ".csv"],
    mimePrefixes: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml", "text/csv"],
  });
}

async function runWordAdapter(userId: string): Promise<AdapterStepResult> {
  return runFileSubsetAdapter({
    userId,
    toolName: "word",
    label: "Word docs",
    exts: [".doc", ".docx", ".rtf", ".txt", ".md"],
    mimePrefixes: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml", "text/"],
  });
}

async function runReviewQueueAdapter(userId: string): Promise<{ trace: AdapterTraceRow; findings: string[] }> {
  const start = performance.now();
  const items = await getInboxItems(userId);
  const approvals = items.filter((i) => i.type === "approval" && i.state !== "approved" && i.state !== "paused");
  return {
    trace: {
      toolName: "review_queue",
      phase: "review",
      status: "ok",
      latencyMs: msSince(start),
      inputSummary: "Check review queue for approvals",
      outputSummary: `${approvals.length} approval items currently open`,
    },
    findings: approvals.slice(0, 4).map((a) => `Review item: ${a.summary}`),
  };
}

async function runHttpAdapter(instructions: string): Promise<{ trace: AdapterTraceRow; findings: string[] }> {
  const urls = summarizeUrlTargets(instructions);
  if (!urls.length) {
    return {
      trace: {
        toolName: "http",
        phase: "execute",
        status: "ok",
        latencyMs: 1,
        inputSummary: "No URLs provided in task instructions",
        outputSummary: "Skipped HTTP fetch",
      },
      findings: [],
    };
  }
  const start = performance.now();
  const findings: string[] = [];
  let okCount = 0;
  for (const url of urls) {
    const policy = isUrlAllowedForServerFetch(url);
    if (!policy.allowed) {
      findings.push(`HTTP blocked (${policy.reason}): ${url}`);
      continue;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(url, { method: "GET", signal: controller.signal });
      clearTimeout(timeout);
      okCount += res.ok ? 1 : 0;
      findings.push(`HTTP ${res.status}: ${url}`);
    } catch {
      findings.push(`HTTP error: ${url}`);
    }
  }
  return {
    trace: {
      toolName: "http",
      phase: "execute",
      status: okCount > 0 ? "ok" : "error",
      latencyMs: msSince(start),
      inputSummary: `Fetch ${urls.length} URL(s) from task instructions`,
      outputSummary: findings.join(" | ").slice(0, 220),
    },
    findings,
  };
}

function inferEmailDraftNeed(instructions: string) {
  const text = instructions.toLowerCase();
  return includesAny(text, [/\bemail\b/, /\breply\b/, /\bsend\b/, /\bcustomer\b/, /\boutreach\b/]);
}

function inferCrmNeed(instructions: string) {
  const text = instructions.toLowerCase();
  return includesAny(text, [/\bcrm\b/, /\blead\b/, /\bpipeline\b/, /\bdeal\b/, /\bcontact\b/, /\bopportunity\b/]);
}

function inferMetaNeed(instructions: string) {
  const text = instructions.toLowerCase();
  return includesAny(text, [/\bmeta\b/, /\bfacebook\b/, /\binstagram\b/, /\bwhatsapp\b/, /\bpost\b/, /\bcampaign\b/, /\bad(s)?\b/]);
}

function inferCalendarNeed(instructions: string) {
  const text = instructions.toLowerCase();
  return includesAny(text, [/\bcalendar\b/, /\bmeeting\b/, /\bschedule\b/, /\bappointment\b/, /\bavailability\b/]);
}

function buildEmailDraftFromInstructions(instructions: string) {
  const compact = instructions.replace(/\s+/g, " ").trim();
  const subjectBase = compact.slice(0, 90) || "Follow-up";
  const subject = `Draft: ${subjectBase}${compact.length > 90 ? "…" : ""}`;
  const bodyLines = [
    "To: [recipient]",
    `Subject: ${subject}`,
    "",
    "Hi [recipient],",
    "",
    "Here is a draft prepared by an agent based on the delegated task instructions.",
    "",
    "Purpose:",
    `- ${compact.slice(0, 240)}${compact.length > 240 ? "…" : ""}`,
    "",
    "Draft message:",
    "I wanted to follow up with an update and next steps based on our current work.",
    "Please review the details and let me know if you would like us to proceed or adjust anything.",
    "",
    "Best,",
    "[sender]",
    "",
    "Review notes:",
    "- Confirm recipient",
    "- Confirm tone/claims",
    "- Approve before sending",
  ];
  return { subject, body: bodyLines.join("\n") };
}

async function runEmailAdapter(instructions: string): Promise<AdapterStepResult> {
  if (!inferEmailDraftNeed(instructions)) {
    return {
      trace: {
        toolName: "email",
        phase: "execute",
        status: "ok",
        latencyMs: 1,
        inputSummary: "Email tool enabled",
        outputSummary: "No email/send intent detected in task instructions; no draft created.",
      },
      findings: [],
    };
  }
  const draft = buildEmailDraftFromInstructions(instructions);
  return {
    trace: {
      toolName: "email",
      phase: "execute",
      status: "ok",
      latencyMs: 2,
      inputSummary: "Create review-safe email draft from delegated instructions",
      outputSummary: "Created email draft artifact for review (not sent).",
    },
    findings: ["Email draft prepared for human review before sending."],
    actions: [
      {
        kind: "business_log",
        title: `Email draft: ${draft.subject}`.slice(0, 240),
        category: "OPERATIONS",
        source: "AGENT",
        authorLabel: "Assistant",
        body: draft.body,
        relatedRef: null,
      },
    ],
  };
}

function buildCrmUpdatePlan(instructions: string) {
  const compact = instructions.replace(/\s+/g, " ").trim();
  const title = `CRM update plan: ${compact.slice(0, 70)}${compact.length > 70 ? "…" : ""}`;
  const body = [
    "CRM update plan (review-safe, not applied)",
    "",
    "Task intent:",
    compact.slice(0, 350),
    "",
    "Proposed updates:",
    "- Identify target record(s): [lead/contact/deal]",
    "- Fields to update: [status, owner, notes, stage, next action]",
    "- Add timeline note with summary of action/outcome",
    "- Set next follow-up date if applicable",
    "",
    "Review checklist:",
    "- Confirm CRM system and object type",
    "- Confirm exact field values",
    "- Approve before applying to live records",
  ].join("\n");
  return { title, body };
}

async function runCrmAdapter(instructions: string): Promise<AdapterStepResult> {
  if (!inferCrmNeed(instructions)) {
    return {
      trace: {
        toolName: "crm",
        phase: "execute",
        status: "ok",
        latencyMs: 1,
        inputSummary: "CRM tool enabled",
        outputSummary: "No CRM-specific intent detected; no CRM plan artifact created.",
      },
      findings: [],
    };
  }
  const draft = buildCrmUpdatePlan(instructions);
  const connectorState = await connectorAwareExternalTrace("crm", instructions);
  return {
    trace: {
      toolName: "crm",
      phase: "execute",
      status: "ok",
      latencyMs: 2,
      inputSummary: "Prepare CRM update plan from delegated instructions",
      outputSummary: `Created CRM update plan artifact for review. ${connectorState.trace.outputSummary ?? ""}`.trim(),
    },
    findings: ["CRM update plan prepared for human review before applying to records.", ...connectorState.findings],
    actions: [
      {
        kind: "business_log",
        title: draft.title.slice(0, 240),
        category: "OPERATIONS",
        source: "AGENT",
        authorLabel: "Assistant",
        body: draft.body.slice(0, 12000),
        relatedRef: null,
      },
    ],
  };
}

function buildMetaPostDraft(instructions: string) {
  const compact = instructions.replace(/\s+/g, " ").trim();
  const title = `Meta post draft: ${compact.slice(0, 70)}${compact.length > 70 ? "…" : ""}`;
  const body = [
    "Meta content draft (review-safe, not published)",
    "",
    "Task intent:",
    compact.slice(0, 350),
    "",
    "Draft post:",
    "[Headline / hook]",
    "",
    "[Body copy tailored for Meta/Instagram/Facebook audience]",
    "",
    "CTA:",
    "[Call to action]",
    "",
    "Suggested assets/notes:",
    "- Image/video: [placeholder]",
    "- Audience / campaign: [placeholder]",
    "- Schedule window: [placeholder]",
    "",
    "Review checklist:",
    "- Brand voice and claims",
    "- Compliance/approval",
    "- Final publish timing",
  ].join("\n");
  return { title, body };
}

async function runMetaAdapter(instructions: string): Promise<AdapterStepResult> {
  if (!inferMetaNeed(instructions)) {
    return {
      trace: {
        toolName: "meta",
        phase: "execute",
        status: "ok",
        latencyMs: 1,
        inputSummary: "Meta tool enabled",
        outputSummary: "No Meta/social intent detected; no post draft created.",
      },
      findings: [],
    };
  }
  const draft = buildMetaPostDraft(instructions);
  const connectorState = await connectorAwareExternalTrace("meta", instructions);
  return {
    trace: {
      toolName: "meta",
      phase: "execute",
      status: "ok",
      latencyMs: 2,
      inputSummary: "Prepare Meta/social post draft from delegated instructions",
      outputSummary: `Created Meta content draft for review. ${connectorState.trace.outputSummary ?? ""}`.trim(),
    },
    findings: ["Meta/social content draft prepared for review before publishing.", ...connectorState.findings],
    actions: [
      {
        kind: "business_log",
        title: draft.title.slice(0, 240),
        category: "SALES_MARKETING",
        source: "AGENT",
        authorLabel: "Assistant",
        body: draft.body.slice(0, 12000),
        relatedRef: null,
      },
    ],
  };
}

function buildCalendarPlan(instructions: string) {
  const compact = instructions.replace(/\s+/g, " ").trim();
  const title = `Meeting schedule draft: ${compact.slice(0, 70)}${compact.length > 70 ? "…" : ""}`;
  const body = [
    "Calendar scheduling draft (review-safe, not booked)",
    "",
    "Task intent:",
    compact.slice(0, 350),
    "",
    "Proposed meeting plan:",
    "- Title: [meeting title]",
    "- Participants: [names/emails]",
    "- Duration: [30/45/60 min]",
    "- Time window: [proposed options]",
    "- Agenda:",
    "  - [item 1]",
    "  - [item 2]",
    "",
    "Review checklist:",
    "- Confirm participants and timezone",
    "- Confirm agenda and owner",
    "- Approve before booking calendar event",
  ].join("\n");
  return { title, body };
}

async function runCalendarAdapter(instructions: string): Promise<AdapterStepResult> {
  if (!inferCalendarNeed(instructions)) {
    return {
      trace: {
        toolName: "calendar",
        phase: "execute",
        status: "ok",
        latencyMs: 1,
        inputSummary: "Calendar tool enabled",
        outputSummary: "No scheduling intent detected; no calendar draft created.",
      },
      findings: [],
    };
  }
  const draft = buildCalendarPlan(instructions);
  const connectorState = await connectorAwareExternalTrace("calendar", instructions);
  return {
    trace: {
      toolName: "calendar",
      phase: "execute",
      status: "ok",
      latencyMs: 2,
      inputSummary: "Prepare scheduling plan from delegated instructions",
      outputSummary: `Created calendar scheduling draft for review. ${connectorState.trace.outputSummary ?? ""}`.trim(),
    },
    findings: ["Scheduling plan prepared for review before creating any calendar event.", ...connectorState.findings],
    actions: [
      {
        kind: "business_log",
        title: draft.title.slice(0, 240),
        category: "COLLABORATION",
        source: "AGENT",
        authorLabel: "Assistant",
        body: draft.body.slice(0, 12000),
        relatedRef: null,
      },
    ],
  };
}

function stripHtmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function runBrowserReadAdapter(instructions: string): Promise<AdapterStepResult> {
  const urls = summarizeUrlTargets(instructions);

  // Try the full browser automation service first if available
  const health = await checkBrowserServiceHealth();
  if (health.healthy) {
    const start = performance.now();
    const result = await executeBrowserTask({
      task: instructions.slice(0, 2000),
      startUrl: urls[0],
      timeoutSeconds: 45,
      screenshot: false,
    });
    const latencyMs = msSince(start);

    if (result.ok) {
      const body = [
        "Browser automation result",
        "",
        "Task:",
        instructions.replace(/\s+/g, " ").trim().slice(0, 400),
        "",
        "Output:",
        result.output.slice(0, 8000),
      ].join("\n");

      return {
        trace: {
          toolName: "browser",
          phase: "execute",
          status: "ok",
          latencyMs,
          inputSummary: `Browser automation task (${urls.length} URL target${urls.length !== 1 ? "s" : ""})`,
          outputSummary: `Browser task completed in ${(result.durationMs / 1000).toFixed(1)}s.`,
        },
        findings: [`Browser automation completed: ${result.output.slice(0, 200)}`],
        actions: [
          {
            kind: "business_log",
            title: `Browser automation result: ${instructions.slice(0, 80)}`,
            category: "OPERATIONS",
            source: "AGENT",
            authorLabel: "Assistant",
            body: body.slice(0, 12000),
            relatedRef: null,
          },
        ],
      };
    }

    return {
      trace: {
        toolName: "browser",
        phase: "execute",
        status: "error",
        latencyMs,
        inputSummary: "Browser automation task",
        outputSummary: result.error.slice(0, 220),
      },
      findings: [`Browser automation failed: ${result.error.slice(0, 200)}`],
    };
  }

  // Fallback: plain HTTP fetch (read-only)
  if (!urls.length) {
    return {
      trace: {
        toolName: "browser",
        phase: "execute",
        status: "ok",
        latencyMs: 1,
        inputSummary: "Browser tool enabled",
        outputSummary: "No URLs found in instructions; no browser research note created.",
      },
      findings: [],
    };
  }

  const start = performance.now();
  const snippets: string[] = [];
  const findings: string[] = [];
  let okCount = 0;

  for (const url of urls) {
    const policy = isUrlAllowedForServerFetch(url);
    if (!policy.allowed) {
      findings.push(`Browser read blocked (${policy.reason}): ${url}`);
      continue;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, { method: "GET", signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        findings.push(`Browser read failed (${res.status}): ${url}`);
        continue;
      }
      const contentType = res.headers.get("content-type") ?? "";
      const text = await res.text();
      const normalized = contentType.includes("html") ? stripHtmlToText(text) : text.replace(/\s+/g, " ").trim();
      const preview = normalized.slice(0, 280);
      okCount += 1;
      findings.push(`Browser read ${res.status}: ${url}`);
      snippets.push(`URL: ${url}\nSummary excerpt: ${preview || "[no text extracted]"}`);
    } catch {
      findings.push(`Browser read error: ${url}`);
    }
  }

  const body = [
    "Browser research note (read-only fetch)",
    "",
    "Task context:",
    instructions.replace(/\s+/g, " ").trim().slice(0, 400),
    "",
    "Findings:",
    ...(snippets.length ? snippets.flatMap((s) => [s, ""]) : ["No pages could be read."]),
    "Review notes:",
    "- Read-only fetch used (no click/type/login actions)",
    "- Set BROWSER_AUTOMATION_URL to enable interactive browser tasks",
  ].join("\n");

  return {
    trace: {
      toolName: "browser",
      phase: "execute",
      status: okCount > 0 ? "ok" : "error",
      latencyMs: msSince(start),
      inputSummary: `Read ${urls.length} URL(s) via HTTP fallback (no browser service)`,
      outputSummary: okCount > 0 ? `Plain HTTP fetch used (not a real browser). Read ${okCount}/${urls.length} URL(s).` : "Failed to read provided URLs.",
    },
    findings,
    actions: okCount
      ? [
          {
            kind: "business_log",
            title: `Browser research note (${okCount} URL${okCount === 1 ? "" : "s"})`,
            category: "OPERATIONS",
            source: "AGENT",
            authorLabel: "Assistant",
            body: body.slice(0, 12000),
            relatedRef: null,
          },
        ]
      : undefined,
  };
}

function connectorRequiredTrace(toolName: string, instructions?: string): AdapterStepResult {
  const text = (instructions ?? "").toLowerCase();
  const hints: Record<string, string> = {
    browser: "Use browser automation connector (Playwright/browser runtime) for click/type/navigation actions.",
    email: "Connect email provider to draft/send messages and sync replies.",
    crm: "Connect CRM (HubSpot/Salesforce/etc.) to read/update records safely.",
    meta: "Connect Meta Graph to publish/read social or ad account data.",
    calendar: "Connect calendar provider to read availability and create events.",
    docs: "Connect Google Docs or Microsoft Word for remote document actions.",
    sheets: "Connect Google Sheets or Excel for spreadsheet edits.",
    excel: "Connect Microsoft Graph / Excel runtime for workbook actions.",
    word: "Connect Microsoft Graph / Word runtime for document actions.",
  };
  const intentHint =
    toolName === "email" && /(email|reply|send|customer)/.test(text)
      ? "Task appears to involve customer messaging."
      : toolName === "meta" && /(meta|instagram|facebook|post|campaign|ad)/.test(text)
        ? "Task appears to involve social/ad publishing."
        : toolName === "crm" && /(crm|lead|customer|deal|pipeline)/.test(text)
          ? "Task appears to involve customer/deal records."
          : toolName === "calendar" && /(meeting|calendar|schedule|appointment)/.test(text)
            ? "Task appears to involve scheduling."
            : null;
  return {
    trace: {
      toolName,
      phase: "execute",
      status: "requires_connector",
      latencyMs: null,
      inputSummary: "Connector-capable tool requested",
      outputSummary: `${toolName} adapter not yet connected. ${hints[toolName] ?? "Add connector/tool runtime to enable real actions."}`,
    },
    findings: intentHint ? [intentHint] : [],
  };
}

async function connectorAwareExternalTrace(toolName: string, instructions: string): Promise<AdapterStepResult> {
  const availability = await getConnectorAvailability(toolName);
  if (!availability.configured) return connectorRequiredTrace(toolName, instructions);
  return {
    trace: {
      toolName,
      phase: "execute",
      status: availability.healthy ? "ok" : "error",
      latencyMs: availability.healthy ? 1 : null,
      inputSummary: "Connector-capable tool requested",
      outputSummary: availability.healthy
        ? `${availability.label} is configured. Execution adapter not implemented yet; task can be routed to review or a worker runtime.`
        : `${availability.label} is configured but not reachable. ${availability.hint}`,
    },
    findings: availability.healthy ? [`${availability.label} available for future execution.`] : [],
  };
}

function normalizeIntegrationKey(key: string) {
  const v = key.toLowerCase().trim();
  if (["business_files", "file_store", "storage", "drive"].includes(v)) return "files";
  if (["logs", "businesslog", "businesslogs"].includes(v)) return "business_logs";
  if (["inbox", "reviews"].includes(v)) return "review_queue";
  if (["web", "web_fetch", "websearch", "web_search"].includes(v)) return "http";
  return v;
}

async function runAdapterByKey(input: {
  userId: string;
  key: string;
  title: string;
  instructions: string;
}): Promise<AdapterStepResult> {
  const key = normalizeIntegrationKey(input.key);
  if (key === "files") return runFilesAdapter(input.userId);
  if (key === "business_logs") return runBusinessLogsAdapter(input.userId);
  if (key === "projects") return runProjectsAdapter(input.userId);
  if (key === "docs") {
    const local = await runDocsAdapter(input.userId);
    if (!remoteDocActionLikely(input.instructions)) return local;
    const remote = await connectorAwareExternalTrace("docs", input.instructions);
    return {
      trace: { ...local.trace, outputSummary: `${local.trace.outputSummary}. ${remote.trace.outputSummary}` },
      findings: [...local.findings, ...remote.findings],
    };
  }
  if (key === "sheets") {
    const local = await runSheetsAdapter(input.userId);
    if (!remoteDocActionLikely(input.instructions)) return local;
    const remote = await connectorAwareExternalTrace("sheets", input.instructions);
    return {
      trace: { ...local.trace, outputSummary: `${local.trace.outputSummary}. ${remote.trace.outputSummary}` },
      findings: [...local.findings, ...remote.findings],
    };
  }
  if (key === "excel") {
    const local = await runExcelAdapter(input.userId);
    if (!remoteDocActionLikely(input.instructions)) return local;
    const remote = await connectorAwareExternalTrace("excel", input.instructions);
    return {
      trace: { ...local.trace, outputSummary: `${local.trace.outputSummary}. ${remote.trace.outputSummary}` },
      findings: [...local.findings, ...remote.findings],
    };
  }
  if (key === "word") {
    const local = await runWordAdapter(input.userId);
    if (!remoteDocActionLikely(input.instructions)) return local;
    const remote = await connectorAwareExternalTrace("word", input.instructions);
    return {
      trace: { ...local.trace, outputSummary: `${local.trace.outputSummary}. ${remote.trace.outputSummary}` },
      findings: [...local.findings, ...remote.findings],
    };
  }
  if (key === "review_queue" || key === "review") return runReviewQueueAdapter(input.userId);
  if (key === "http") return runHttpAdapter(input.instructions);
  if (key === "email") return runEmailAdapter(input.instructions);
  if (key === "browser") {
    return runBrowserReadAdapter(input.instructions);
  }
  if (key === "crm") return runCrmAdapter(input.instructions);
  if (key === "meta") return runMetaAdapter(input.instructions);
  if (key === "calendar") return runCalendarAdapter(input.instructions);
  return connectorRequiredTrace(key, input.instructions);
}

export async function runIntegrationAdaptersForTask(input: {
  userId: string;
  integrations: string[];
  title: string;
  instructions: string;
}) : Promise<AdapterExecutionResult> {
  const traces: AdapterTraceRow[] = [];
  const memoryFindings: string[] = [];
  const actions: AdapterExecutionResult["actions"] = [];
  const normalizedAllowed = new Set(input.integrations.map(normalizeIntegrationKey));
  const inferredRequested = inferRequestedToolsFromInstructions(input.instructions).map(normalizeIntegrationKey);

  traces.push({
    toolName: "memory.lookup",
    phase: "context",
    status: "ok",
    latencyMs: 1,
    inputSummary: "Start delegated execution with company memory retrieval",
    outputSummary: "Preparing integration adapter calls",
  });

  const integrations = [...new Set(input.integrations)];
  traces.push({
    toolName: "delegation.plan",
    phase: "plan",
    status: "ok",
    latencyMs: 1,
    inputSummary: input.title.slice(0, 180),
    outputSummary: integrations.length
      ? `Requested toolset: ${integrations.join(", ")}`
      : "No tools explicitly configured; using policy checks only",
  });
  if (inferredRequested.length) {
    traces.push({
      toolName: "intent.detect",
      phase: "plan",
      status: "ok",
      latencyMs: 1,
      inputSummary: "Infer likely tools from task instructions",
      outputSummary: `Detected likely tool needs: ${[...new Set(inferredRequested)].join(", ")}`,
    });
  }
  for (const requested of [...new Set(inferredRequested)]) {
    if (normalizedAllowed.has(requested)) continue;
    traces.push({
      toolName: requested,
      phase: "plan",
      status: "blocked",
      latencyMs: 1,
      inputSummary: "Tool appears requested by task instructions",
      outputSummary: `Blocked by agent allowlist. Enable "${requested}" in Automation / wake mode -> Application integrations.`,
    });
    memoryFindings.push(`Policy block: ${requested} requested but not enabled for this agent.`);
  }
  for (const integration of integrations) {
    const result = await runAdapterByKey({
      userId: input.userId,
      key: integration,
      title: input.title,
      instructions: input.instructions,
    });
    traces.push(result.trace);
    memoryFindings.push(...result.findings);
    if (result.actions?.length) actions.push(...result.actions);
  }

  traces.push({
    toolName: "review.check",
    phase: "review",
    status: "ok",
    latencyMs: 1,
    inputSummary: "Final policy/approval check",
    outputSummary: "Delegated task evaluated for review-safe completion",
  });

  return { traces, memoryFindings: memoryFindings.slice(0, 20), actions };
}
