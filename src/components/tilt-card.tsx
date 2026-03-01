"use client";

import { useCallback, useRef, type ReactNode } from "react";

/** Subtle lift on hover — just enough to feel interactive, not flashy. */
export function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleEnter = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translateY(-4px)";
    el.style.boxShadow = "0 20px 60px -12px rgba(0,0,0,0.4)";
  }, []);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translateY(0px)";
    el.style.boxShadow = "";
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={className}
      style={{ transition: "transform 0.4s ease, box-shadow 0.4s ease" }}
    >
      {children}
    </div>
  );
}
