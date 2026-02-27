"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  badge?: string | null;
  badgeTone?: "warn" | "info" | "neutral";
  badgeStyle?: React.CSSProperties;
  dataTour?: string;
  actionLabel?: string;
  actionHref?: string;
};

const STANDALONE_PATHS = new Set(["/agents/hire"]);

export function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="wf-soft flex flex-wrap items-center gap-2 rounded-2xl p-2">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href ||
              (pathname?.startsWith(`${item.href}/`) && !STANDALONE_PATHS.has(pathname ?? ""));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative wf-btn px-3 py-1.5 text-sm ${active ? "border-teal-400/40 bg-teal-500/15 text-teal-200 shadow-[0_0_0_1px_rgba(20,184,166,0.15)]" : ""}`}
          >
            {item.label}
            {item.badge ? (
              <span
                style={item.badgeStyle}
                className={`absolute -right-2 -top-2 rounded-md border px-1.5 py-0.5 text-[10px] leading-none shadow-sm ${
                  item.badgeTone === "warn"
                    ? "border-orange-300 bg-orange-100 text-orange-900"
                    : item.badgeTone === "info"
                      ? "border-blue-200 bg-blue-100 text-blue-900"
                      : "border-[var(--border)] bg-zinc-100 text-zinc-700"
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string | null }) {
  const active =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href ||
        (pathname?.startsWith(`${item.href}/`) && !STANDALONE_PATHS.has(pathname ?? ""));

  return (
    <div className="relative">
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        data-tour={item.dataTour}
        onClick={active && item.href === "/" ? (e: React.MouseEvent) => e.preventDefault() : undefined}
        className={`block rounded-md px-2.5 py-1.5 pr-12 text-left text-[13px] transition ${
          active
            ? "bg-white/[0.06] text-white/95"
            : "text-white/55 hover:bg-white/[0.04] hover:text-white/85"
        }`}
      >
        {item.label}
        {item.badge ? (
          <span
            style={item.badgeStyle}
            className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md border px-2 py-0.5 text-[10px] leading-none shadow-sm ${
              item.badgeTone === "warn"
                ? "border-orange-300 bg-orange-100 text-orange-900 shadow-[0_0_0_1px_rgba(251,146,60,0.18),0_0_14px_rgba(251,146,60,0.18)]"
                : item.badgeTone === "info"
                  ? "border-blue-200 bg-blue-100 text-blue-900"
                  : "border-[var(--border)] bg-zinc-100 text-zinc-700"
            }`}
          >
            {item.badge}
          </span>
        ) : null}
      </Link>
      {item.actionLabel && item.actionHref ? (
        <Link
          href={item.actionHref}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-0.5 text-[11px] font-medium text-white/35 transition hover:bg-white/[0.06] hover:text-white/65"
        >
          {item.actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function AppNavVertical({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-0.5">
      {items.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

export type NavGroup = {
  label: string | null;
  items: NavItem[];
};

export function AppNavVerticalGrouped({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-2">
      {groups.map((group, gi) => (
        <div key={group.label ?? gi}>
          {group.label ? (
            <div className="mb-0.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/28">{group.label}</div>
          ) : null}
          <div className="grid gap-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
