"use client";

import { useState, useRef } from "react";
import type { ExpectedFileStatus } from "@/lib/expected-business-files";

type FileRow = {
  id: string;
  name: string;
  category: string;
};

const IMPACT_DOT: Record<string, string> = {
  critical: "bg-rose-400",
  high: "bg-amber-400",
  medium: "bg-white/50",
};

export function ExpectedFilesBanner({
  statuses: initialStatuses,
  onFileUploaded,
}: {
  statuses: ExpectedFileStatus[];
  onFileUploaded?: (files: FileRow[]) => void;
}) {
  const [statuses, setStatuses] = useState(initialStatuses);
  const [dismissed, setDismissed] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const visibleStatuses = statuses.filter((s) => !ignored.has(s.entry.id));
  const hasCriticalMissing = visibleStatuses.some((s) => !s.satisfied && s.entry.impact === "critical");
  if (dismissed || !hasCriticalMissing) return null;

  const satisfiedCount = visibleStatuses.filter((s) => s.satisfied).length;

  async function uploadForEntry(entryId: string, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const entry = statuses.find((s) => s.entry.id === entryId)?.entry;
    if (!entry) return;

    setUploading(entryId);
    setError(null);
    try {
      const form = new FormData();
      form.append("files", fileList[0]);
      form.set("category", entry.category);
      form.set("source", "IMPORT");

      const res = await fetch("/api/business-logs/upload", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string; files?: FileRow[] };
      if (!res.ok) throw new Error(data.error || "Upload failed");

      if (data.files && data.files.length > 0) {
        const uploaded = data.files[0];
        setStatuses((curr) =>
          curr.map((s) =>
            s.entry.id === entryId
              ? { ...s, satisfied: true, matchedFile: { id: uploaded.id, name: uploaded.name } }
              : s,
          ),
        );
        onFileUploaded?.(data.files);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-amber-300">Expected Business Files</h3>
          <p className="mt-0.5 text-xs text-white/40">
            Agents work better with business context. Upload key files to improve their output.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 text-white/30 transition hover:bg-white/[0.06] hover:text-white/50"
          title="Dismiss"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-3 text-xs text-white/35">
        {satisfiedCount} of {visibleStatuses.length} file types uploaded
      </div>

      <div className="mt-3 space-y-1.5">
        {visibleStatuses.map((status) => {
          const { entry } = status;
          const isUploading = uploading === entry.id;
          const isConfirming = confirming === entry.id;

          return (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                {status.satisfied ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                ) : (
                  <span className={`h-2 w-2 shrink-0 rounded-full ${IMPACT_DOT[entry.impact]}`} />
                )}
                <span className={`text-xs truncate ${status.satisfied ? "text-white/35" : "text-white/70"}`}>
                  {entry.label}
                  {status.satisfied && status.matchedFile && (
                    <span className="ml-1.5 text-white/25">({status.matchedFile.name})</span>
                  )}
                </span>
              </div>
              {!status.satisfied && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {isConfirming ? (
                    <span className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-white/40">Are you sure?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIgnored((prev) => new Set(prev).add(entry.id));
                          setConfirming(null);
                        }}
                        className="rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-rose-300 transition hover:bg-rose-500/20"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-white/50 transition hover:bg-white/[0.06]"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <>
                      <label className={`cursor-pointer rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300 transition hover:bg-amber-500/20 ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                        {isUploading ? "..." : "Upload"}
                        <input
                          ref={(el) => { fileInputRefs.current[entry.id] = el; }}
                          type="file"
                          className="hidden"
                          onChange={(e) => void uploadForEntry(entry.id, e.target.files)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setConfirming(entry.id)}
                        className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/35 transition hover:bg-white/[0.06] hover:text-white/50"
                      >
                        Ignore
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 text-xs text-rose-400">{error}</div>
      )}
    </div>
  );
}
