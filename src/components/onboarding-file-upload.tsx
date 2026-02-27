"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import type { ExpectedFileStatus } from "@/lib/expected-business-files";
import { EXPECTED_BUSINESS_FILES } from "@/lib/expected-business-files";

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

const IMPACT_LABEL: Record<string, string> = {
  critical: "text-rose-400",
  high: "text-amber-400",
  medium: "text-white/40",
};

export function OnboardingFileUpload({
  initialStatuses,
}: {
  initialStatuses: ExpectedFileStatus[];
}) {
  const router = useRouter();
  const [statuses, setStatuses] = useState(initialStatuses);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const bulkInputRef = useRef<HTMLInputElement | null>(null);

  const satisfiedCount = statuses.filter((s) => s.satisfied).length;

  async function uploadForEntry(entryId: string, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const entry = EXPECTED_BUSINESS_FILES.find((e) => e.id === entryId);
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
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function uploadBulk(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading("bulk");
    setError(null);
    try {
      const form = new FormData();
      Array.from(fileList).slice(0, 20).forEach((f) => form.append("files", f));
      form.set("source", "IMPORT");

      const res = await fetch("/api/business-logs/upload", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string; files?: FileRow[] };
      if (!res.ok) throw new Error(data.error || "Upload failed");

      if (data.files) {
        setStatuses((curr) =>
          curr.map((s) => {
            if (s.satisfied) return s;
            const match = data.files!.find((f) => {
              if (f.category === s.entry.category) {
                const lower = f.name.toLowerCase();
                return s.entry.matchKeywords.some((kw) => lower.includes(kw));
              }
              return false;
            });
            if (match) return { ...s, satisfied: true, matchedFile: { id: match.id, name: match.name } };
            return s;
          }),
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-teal-400/80">Business Files</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Upload your business files</h1>
        <p className="mt-1 text-sm text-white/45">
          Agents use these files for context when working. Upload what you can now — you can always add more later from Business Logs.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-teal-400 transition-all duration-300"
            style={{ width: `${Math.round((satisfiedCount / statuses.length) * 100)}%` }}
          />
        </div>
        <span className="text-xs text-white/40">{satisfiedCount} of {statuses.length} uploaded</span>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {statuses.map((status) => {
          const { entry } = status;
          const isUploading = uploading === entry.id;
          return (
            <div
              key={entry.id}
              className={`rounded-2xl border p-4 transition ${
                status.satisfied
                  ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                  : "border-white/[0.07] bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {status.satisfied ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                        <svg className="h-3 w-3 text-emerald-400" viewBox="0 0 16 16" fill="none">
                          <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    ) : (
                      <span className={`h-2 w-2 shrink-0 rounded-full ${IMPACT_DOT[entry.impact]}`} />
                    )}
                    <span className={`text-sm font-medium ${status.satisfied ? "text-white/50" : ""}`}>
                      {entry.label}
                    </span>
                    {!status.satisfied && (
                      <span className={`text-[10px] ${IMPACT_LABEL[entry.impact]}`}>
                        {entry.impact}
                      </span>
                    )}
                  </div>
                  <div className={`mt-1 ml-7 text-xs ${status.satisfied ? "text-white/30" : "text-white/40"}`}>
                    {status.satisfied && status.matchedFile
                      ? status.matchedFile.name
                      : entry.description}
                  </div>
                  {!status.satisfied && (
                    <div className="mt-1 ml-7 text-[10px] text-white/25">
                      Formats: {entry.exampleFormats.join(", ")}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {status.satisfied ? (
                    <span className="text-xs text-emerald-400/70">Uploaded</span>
                  ) : (
                    <label className={`cursor-pointer rounded-lg border border-teal-700 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-300 transition hover:bg-teal-500/20 ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                      {isUploading ? "Uploading..." : "Upload"}
                      <input
                        ref={(el) => { fileInputRefs.current[entry.id] = el; }}
                        type="file"
                        className="hidden"
                        onChange={(e) => void uploadForEntry(entry.id, e.target.files)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk upload */}
      <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Upload other files</div>
            <div className="mt-0.5 text-xs text-white/40">
              Any business documents — they will be auto-categorized.
            </div>
          </div>
          <label className={`cursor-pointer rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/[0.06] ${uploading === "bulk" ? "opacity-50 pointer-events-none" : ""}`}>
            {uploading === "bulk" ? "Uploading..." : "Choose files"}
            <input
              ref={bulkInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void uploadBulk(e.target.files)}
            />
          </label>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/onboarding?step=5")}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.06]"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/onboarding/skills")}
            className="text-sm text-white/35 transition hover:text-white/55"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => router.push("/onboarding/skills")}
            className="wf-btn-primary px-5 py-2 text-sm font-medium"
          >
            Continue to skills
          </button>
        </div>
      </div>
    </div>
  );
}
