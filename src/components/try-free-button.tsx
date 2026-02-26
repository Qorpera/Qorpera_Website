"use client";

import { useState } from "react";

type ScheduleOption = { value: string; label: string; price: string };

export function TryFreeButton({
  agentKind,
  scheduleOptions,
}: {
  agentKind: string;
  scheduleOptions: ScheduleOption[];
}) {
  const [open, setOpen] = useState(false);
  const [schedule, setSchedule] = useState(scheduleOptions.find((o) => o.value === "WEEKLY")?.value ?? scheduleOptions[0]?.value ?? "WEEKLY");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="wf-btn-info rounded-2xl px-4 py-2.5 text-sm font-medium"
      >
        Try free
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Dialog */}
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0c1117] p-6 shadow-2xl">
            <div className="text-base font-semibold">Free trial — 1 hour</div>
            <p className="mt-2 text-sm text-white/55 leading-relaxed">
              The free trial runs for <span className="text-white/85 font-medium">1 hour</span>, after which the agent goes offline automatically. You can hire at any time to keep it running.
            </p>
            <div className="mt-5 flex gap-2.5">
              <form action="/api/agents/hire" method="post" className="flex-1">
                <input type="hidden" name="agentKind" value={agentKind} />
                <input type="hidden" name="schedule" value={schedule} />
                <input type="hidden" name="mode" value="LOCAL_DEMO" />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-teal-500/15 border border-teal-500/30 px-4 py-2 text-sm font-medium text-teal-300 transition hover:bg-teal-500/25"
                >
                  I understand
                </button>
              </form>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white/40 transition hover:text-white/70"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
