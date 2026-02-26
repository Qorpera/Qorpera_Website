"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [{ href: "/agents/hire", label: "Workforce" }] as const;

export function AgentsSectionNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-5 flex flex-wrap gap-2">
      {ITEMS.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`wf-btn px-3 py-1.5 text-sm ${active ? "ring-2 ring-teal-700/15" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
