"use client";

import Link from "next/link";
import { useBasket } from "@/components/basket-context";

export function BasketSidebarButton() {
  const { count } = useBasket();

  return (
    <Link
      href="/agents/hire/basket"
      title="Hiring basket"
      aria-label={`Hiring basket${count > 0 ? ` (${count} item${count !== 1 ? "s" : ""})` : ""}`}
      className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-400/10 text-emerald-300/80 transition hover:bg-emerald-400/15 hover:text-emerald-200"
    >
      {/* Contract / document icon */}
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M4 3.5A1.5 1.5 0 0 1 5.5 2h6.086a1.5 1.5 0 0 1 1.06.44l2.915 2.914A1.5 1.5 0 0 1 16 6.414V16.5A1.5 1.5 0 0 1 14.5 18h-9A1.5 1.5 0 0 1 4 16.5v-13Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M7 10.5h6M7 13.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M11.5 2v3.5a.5.5 0 0 0 .5.5H16"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-[var(--background)] bg-emerald-500 text-[9px] font-bold text-zinc-950">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
