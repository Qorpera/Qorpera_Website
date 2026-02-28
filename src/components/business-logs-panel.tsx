"use client";

import { useState } from "react";
import type { ExpectedFileStatus } from "@/lib/expected-business-files";
import { ExpectedFilesBanner } from "@/components/expected-files-banner";

type LogRow = {
  id: string;
  title: string;
  category: string;
  source: string;
  authorLabel: string | null;
  body: string;
  relatedRef: string | null;
  createdAt: string;
};

type FileRow = {
  id: string;
  name: string;
  category: string;
  source: string;
  mimeType: string | null;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export function BusinessLogsPanel({
  initial,
  initialFiles,
  expectedFileStatuses,
}: {
  initial: LogRow[];
  initialFiles: FileRow[];
  expectedFileStatuses?: ExpectedFileStatus[];
}) {
  const [logs, setLogs] = useState(initial);
  const [files, setFiles] = useState<FileRow[]>(initialFiles);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [source, setSource] = useState("OWNER");
  const [authorLabel, setAuthorLabel] = useState("");
  const [relatedRef, setRelatedRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"files" | "notes" | "chat">("files");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const chatLogs = logs.filter((log) => (log.relatedRef ?? "").startsWith("CHAT_LOG:"));
  const noteLogs = logs.filter((log) => !(log.relatedRef ?? "").startsWith("CHAT_LOG:"));

  async function importFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const picked = Array.from(fileList).slice(0, 20);
      const form = new FormData();
      picked.forEach((file) => form.append("files", file));
      form.set("source", "IMPORT");
      const res = await fetch("/api/business-logs/upload", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string; files?: FileRow[] };
      if (!res.ok) throw new Error(data.error || "Failed to import files");
      if (Array.isArray(data.files)) { const newFiles = data.files; setFiles((curr) => [...newFiles, ...curr]); }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to import files");
    } finally {
      setBusy(false);
    }
  }

  async function deleteFile(fileId: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/business-logs/files/${fileId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Delete failed");
      }
      setFiles((curr) => curr.filter((f) => f.id !== fileId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete file");
    } finally {
      setDeleting(false);
      setConfirmingDelete(null);
    }
  }

  async function submit() {
    if (!title.trim() || !body.trim()) {
      setError("Title and content are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/business-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category, source, authorLabel, relatedRef }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; log?: LogRow };
      if (!res.ok || !data.log) throw new Error(data.error || "Failed to post log");
      const newLog = data.log;
      setLogs((curr) => [newLog, ...curr]);
      setTitle("");
      setBody("");
      setRelatedRef("");
      if (source !== "OWNER") setAuthorLabel("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to post log");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {expectedFileStatuses && (
        <ExpectedFilesBanner
          statuses={expectedFileStatuses}
          onFileUploaded={(newFiles) => {
            const mapped = newFiles.map((f) => ({
              ...f,
              source: "IMPORT",
              mimeType: null,
              sizeBytes: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));
            setFiles((curr) => [...mapped, ...curr]);
          }}
        />
      )}
      <header className="wf-panel rounded-3xl p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Business Logs</h1>
        <p className="mt-2 text-base wf-muted">
          One place for financial notes, project updates, collaborations, and agent-posted work. The advisor reads this context.
        </p>
      </header>

      <section className="wf-panel rounded-3xl p-6">
        <div className="mb-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setActiveTab("files")} className={`rounded-xl border px-4 py-2 text-sm ${activeTab === "files" ? "border-teal-700 bg-teal-50 text-teal-900" : "border-[var(--border)] bg-white/80"}`}>Files</button>
          <button type="button" onClick={() => setActiveTab("chat")} className={`rounded-xl border px-4 py-2 text-sm ${activeTab === "chat" ? "border-violet-700 bg-violet-50 text-violet-900" : "border-[var(--border)] bg-white/80"}`}>Chat logs</button>
          <button type="button" onClick={() => setActiveTab("notes")} className={`rounded-xl border px-4 py-2 text-sm ${activeTab === "notes" ? "border-blue-700 bg-blue-50 text-blue-900" : "border-[var(--border)] bg-white/80"}`}>Notes / posts</button>
        </div>

        {activeTab === "files" ? (
          <>
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div className="wf-soft rounded-2xl p-4">
            <div className="text-sm font-medium">Company files directory</div>
            <div className="mt-1 text-sm wf-muted">
              Store files related to the business (Excel, Word, PDFs, CSVs, notes, contracts, project docs). The advisor can use extracted text when available.
            </div>
          </div>
          <label className="wf-btn-info cursor-pointer px-4 py-2 text-sm">
            Upload files
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void importFiles(e.target.files)}
            />
          </label>
          <button
            type="button"
            className="wf-btn px-4 py-2 text-sm"
            onClick={() => {
              setSource("AGENT");
              setCategory("PROJECT");
              setAuthorLabel("Agent");
              setTitle("Agent work update");
            }}
          >
            Agent post preset
          </button>
        </div>

        <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="grid grid-cols-[1.3fr_120px_120px_140px_72px] gap-2 border-b border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-xs uppercase tracking-[0.14em] wf-muted">
            <div>Name</div>
            <div>Category</div>
            <div>Source</div>
            <div>Updated</div>
            <div></div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {files.length === 0 ? (
              <div className="px-4 py-4 text-sm wf-muted">No files uploaded yet.</div>
            ) : (
              files.map((file) => (
                <div key={file.id} className="grid grid-cols-[1.3fr_120px_120px_140px_72px] gap-2 border-b border-[rgba(255,255,255,0.04)] px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <a
                      href={`/api/business-logs/files/${file.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-medium hover:underline"
                      title={`Open ${String(file.name ?? "file")}`}
                    >
                      {String(file.name ?? "Unnamed file")}
                    </a>
                    <div className="truncate text-xs wf-muted">
                      {file.mimeType ? String(file.mimeType) : "unknown type"} · {typeof file.sizeBytes === "number" ? `${Math.max(1, Math.round(file.sizeBytes / 1024))} KB` : ""}
                    </div>
                  </div>
                  <div className="truncate">{String(file.category ?? "").toLowerCase()}</div>
                  <div className="truncate">{String(file.source ?? "").toLowerCase()}</div>
                  <div className="truncate text-xs wf-muted">
                    {file.updatedAt ? new Date(String(file.updatedAt)).toLocaleDateString() : file.createdAt ? new Date(String(file.createdAt)).toLocaleDateString() : ""}
                  </div>
                  <div className="flex items-center justify-center gap-0.5">
                    {confirmingDelete === file.id ? (
                      <span className="flex items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => void deleteFile(file.id)}
                          className="rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(null)}
                          className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-white/50 transition hover:bg-white/[0.06]"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <>
                        <a
                          href={`/api/files/${file.id}`}
                          download={file.name}
                          className="rounded p-1 text-white/35 transition hover:bg-white/[0.06] hover:text-white/70"
                          title="Download file"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M10 3v9m0 0-3-3m3 3 3-3M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </a>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(file.id)}
                          className="rounded p-1 text-white/35 transition hover:bg-rose-500/15 hover:text-rose-300"
                          title="Delete file"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M7.5 3.5h5m-7 2h9m-1 0-.7 9.1a1.5 1.5 0 0 1-1.49 1.39H8.69A1.5 1.5 0 0 1 7.2 14.6L6.5 5.5m2.25 2.5v5m3-5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
          </>
        ) : activeTab === "chat" ? (
          <div className="space-y-3">
            <div className="wf-soft rounded-2xl p-4">
              <div className="text-sm font-medium">Chat logs (advisor memory)</div>
              <div className="mt-1 text-sm wf-muted">
                Saved advisor conversations used to teach agents how the business operates and how the owner makes decisions.
              </div>
            </div>
            {chatLogs.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] px-4 py-4 text-sm wf-muted">
                No chat logs yet. Start using the Advisor Chat and sessions will appear here automatically.
              </div>
            ) : (
              chatLogs.map((log) => (
                <article key={log.id} className="rounded-2xl border border-[var(--border)] px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-base font-medium">{log.title}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="wf-chip rounded-full">chat log</span>
                        <span className="wf-chip rounded-full">{log.source.toLowerCase()}</span>
                        {log.authorLabel ? <span className="wf-chip rounded-full">by {log.authorLabel}</span> : null}
                      </div>
                    </div>
                    <div className="text-xs wf-muted">{new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                  <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 text-sm leading-6 text-white/85">
                    {log.body}
                  </pre>
                  {log.relatedRef?.startsWith("CHAT_LOG:") ? (
                    <a href={`/?session=${log.relatedRef.replace("CHAT_LOG:", "")}`} className="mt-3 inline-flex wf-btn px-3 py-2 text-sm">
                      Reopen session
                    </a>
                  ) : null}
                </article>
              ))
            )}
          </div>
        ) : (
          <>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3" placeholder="Q1 budget revision / Client handoff notes / Agent output summary" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3">
                {["FINANCIAL","PROJECT","COLLABORATION","OPERATIONS","SALES","MARKETING","LEGAL","GENERAL"].map((c) => <option key={c} value={c}>{c.toLowerCase()}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Source
              <select value={source} onChange={(e) => setSource(e.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3">
                {["OWNER","AGENT","IMPORT"].map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            Posted by (optional)
            <input value={authorLabel} onChange={(e) => setAuthorLabel(e.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3" placeholder="Owner / Analyst Agent / Finance Rep" />
          </label>
          <label className="text-sm">
            Related ref (optional)
            <input value={relatedRef} onChange={(e) => setRelatedRef(e.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3" placeholder="Project: onboarding-redesign / Doc: q1-forecast-v2" />
          </label>
        </div>
        <label className="mt-4 block text-sm">
          Content
          <textarea value={body} onChange={(e) => setBody(e.target.value)} className="mt-2 h-40 w-full rounded-2xl border border-[var(--border)] bg-white/80 p-4" placeholder="Paste financial notes, project updates, collaboration outcomes, or agent work summaries..." />
        </label>
        {error ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={submit} disabled={busy} className="wf-btn-primary px-5 py-2.5 text-sm disabled:opacity-60">
            {busy ? "Posting..." : "Post to business logs"}
          </button>
        </div>
          </>
        )}
      </section>

      <section className="space-y-3">
        {noteLogs.length === 0 ? (
          <div className="wf-panel rounded-3xl p-6 text-base wf-muted">No business logs yet.</div>
        ) : (
          noteLogs.map((log) => (
            <article key={log.id} className="wf-panel rounded-3xl p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{log.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="wf-chip rounded-full">{log.category.toLowerCase()}</span>
                    <span className="wf-chip rounded-full">{log.source.toLowerCase()}</span>
                    {log.authorLabel ? <span className="wf-chip rounded-full">by {log.authorLabel}</span> : null}
                    {log.relatedRef ? <span className="wf-chip rounded-full">{log.relatedRef}</span> : null}
                  </div>
                </div>
                <div className="text-sm wf-muted">{new Date(log.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-4 whitespace-pre-wrap text-base leading-7">{log.body}</div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
