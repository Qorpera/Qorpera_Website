"use client";

import { useEffect, useRef, useState } from "react";

type PendingJob = {
  id: string;
  title: string;
  jobType: string;
  riskLevel: string;
  createdAt: string;
};

type ApiResponse = {
  jobs: PendingJob[];
  onlineRunnerCount: number;
};

function riskBadgeClass(riskLevel: string) {
  if (riskLevel === "high") return "bg-red-500/15 text-red-300 border-red-500/30";
  if (riskLevel === "low") return "bg-teal-500/15 text-teal-300 border-teal-500/30";
  return "bg-amber-500/15 text-amber-300 border-amber-500/30";
}

export function RunnerApprovalsSidebar({ initialJobs }: { initialJobs: PendingJob[] }) {
  const [jobs, setJobs] = useState<PendingJob[]>(initialJobs);
  const [expanded, setExpanded] = useState(initialJobs.length > 0);
  const [actioning, setActioning] = useState<Set<string>>(new Set());
  const prevCountRef = useRef(initialJobs.length);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/advisor/runner-approvals");
        if (!res.ok) return;
        const data = (await res.json()) as ApiResponse;
        setJobs(data.jobs);
        if (data.jobs.length > 0 && prevCountRef.current === 0) {
          setExpanded(true);
        }
        prevCountRef.current = data.jobs.length;
      } catch {
        // ignore network errors
      }
    };

    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, []);

  async function handleAction(jobId: string, action: "approve" | "cancel") {
    setActioning((s) => new Set(s).add(jobId));
    // Optimistic removal
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    try {
      await fetch("/api/advisor/runner-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, jobId }),
      });
    } catch {
      // Even on error keep it removed — next poll will restore if needed
    } finally {
      setActioning((s) => {
        const next = new Set(s);
        next.delete(jobId);
        return next;
      });
    }
  }

  if (jobs.length === 0) return null;

  return (
    <div className="border-b border-[rgba(255,255,255,0.04)] px-2 py-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-300/80 hover:bg-white/[0.03] transition"
      >
        <span className="flex items-center gap-1.5">
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          Runner Approvals
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded border border-amber-400/40 bg-amber-500/20 px-1.5 py-px text-[10px] font-semibold text-amber-200">
            {jobs.length}
          </span>
          <svg
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="mt-1 space-y-1">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-md border border-[rgba(255,255,255,0.05)] bg-white/[0.025] px-2 py-1.5"
            >
              <div className="mb-1 flex flex-wrap items-center gap-1">
                <span className="truncate text-[12px] text-white/80 flex-1">{job.title}</span>
              </div>
              <div className="mb-1.5 flex flex-wrap gap-1">
                <span className="rounded border border-[rgba(255,255,255,0.1)] bg-white/[0.06] px-1.5 py-px text-[10px] text-white/50">
                  {job.jobType}
                </span>
                <span className={`rounded border px-1.5 py-px text-[10px] ${riskBadgeClass(job.riskLevel)}`}>
                  {job.riskLevel}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={actioning.has(job.id)}
                  onClick={() => handleAction(job.id, "approve")}
                  className="flex-1 rounded bg-teal-500/20 px-2 py-0.5 text-[11px] font-medium text-teal-300 transition hover:bg-teal-500/30 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={actioning.has(job.id)}
                  onClick={() => handleAction(job.id, "cancel")}
                  className="flex-1 rounded bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-white/45 transition hover:bg-white/[0.08] hover:text-white/65 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
