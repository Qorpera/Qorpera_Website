"use client";

import { useCallback, useEffect, useState } from "react";

type TourStep = {
  target: string;
  title: string;
  description: string;
  position: "right" | "bottom" | "left";
};

const TOUR_STEPS: TourStep[] = [
  {
    target: "sidebar-nav",
    title: "Sidebar",
    description: "Browse your workspace: advisor, inbox, agents, settings.",
    position: "right",
  },
  {
    target: "chat-input",
    title: "Advisor chat",
    description: "Your command center. Ask anything, delegate tasks.",
    position: "bottom",
  },
  {
    target: "nav-inbox",
    title: "Inbox",
    description: "Agent work lands here for your review.",
    position: "right",
  },
  {
    target: "nav-agents",
    title: "Agents",
    description: "Activate, configure, and monitor your AI team roles.",
    position: "right",
  },
  {
    target: "nav-settings",
    title: "Settings",
    description: "Connect models, manage API keys.",
    position: "right",
  },
];

function getTooltipPosition(el: HTMLElement, position: TourStep["position"]) {
  const rect = el.getBoundingClientRect();
  const gap = 12;

  switch (position) {
    case "right":
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + gap,
        transform: "translateY(-50%)",
        arrowClass: "before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-8 before:border-transparent before:border-r-[rgba(20,30,40,0.95)]",
      };
    case "bottom":
      return {
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
        arrowClass: "before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-[rgba(20,30,40,0.95)]",
      };
    case "left":
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - gap,
        transform: "translate(-100%, -50%)",
        arrowClass: "before:absolute before:left-full before:top-1/2 before:-translate-y-1/2 before:border-8 before:border-transparent before:border-l-[rgba(20,30,40,0.95)]",
      };
  }
}

export function PlatformTour() {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; transform: string; arrowClass: string } | null>(null);

  const currentStep = TOUR_STEPS[step];

  const updatePosition = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${currentStep.target}"]`);
    if (el) {
      setPos(getTooltipPosition(el, currentStep.position));
    }
  }, [currentStep]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [updatePosition]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setDismissed(true);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  async function completeTour() {
    setDismissed(true);
    await fetch("/api/onboarding/tour-complete", { method: "POST" }).catch(() => {});
  }

  function handleNext() {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      void completeTour();
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  if (dismissed || !currentStep || !pos) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40"
        onClick={() => void completeTour()}
      />

      {/* Tooltip */}
      <div
        className={`fixed z-[9999] w-72 rounded-xl border border-teal-500/20 bg-[rgba(20,30,40,0.95)] p-4 shadow-xl shadow-black/30 ${pos.arrowClass} before:content-['']`}
        style={{
          top: pos.top,
          left: pos.left,
          transform: pos.transform,
        }}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-3">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === step ? "w-4 bg-teal-400" : i < step ? "w-2 bg-teal-400/40" : "w-2 bg-white/15"
              }`}
            />
          ))}
        </div>

        <div className="text-sm font-medium text-white/90">{currentStep.title}</div>
        <p className="mt-1 text-xs text-white/50 leading-relaxed">{currentStep.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <div>
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="text-xs text-white/40 hover:text-white/60 transition"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void completeTour()}
                className="text-xs text-white/30 hover:text-white/50 transition"
              >
                Skip tour
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-teal-500/20 border border-teal-500/30 px-3 py-1 text-xs font-medium text-teal-300 hover:bg-teal-500/30 transition"
          >
            {step === TOUR_STEPS.length - 1 ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
