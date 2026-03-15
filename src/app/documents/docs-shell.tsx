"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

/* ── Navigation data ─────────────────────────────────────────── */

interface NavItem {
  slug: string;
  label: string;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const DOCS_NAV: NavGroup[] = [
  {
    heading: "Qorpera Platform",
    items: [
      { slug: "", label: "Overview" },
      { slug: "platform-architecture", label: "Platform architecture" },
      { slug: "getting-started", label: "Getting started" },
      { slug: "business-graph", label: "Business graph" },
      { slug: "situation-detection", label: "Situation detection" },
      { slug: "trust-gradient", label: "Trust gradient" },
    ],
  },
  {
    heading: "Your AI",
    items: [
      { slug: "how-ai-learns", label: "How the AI learns" },
      { slug: "copilot", label: "Copilot" },
      { slug: "approval-workflow", label: "Approval workflow" },
    ],
  },
  {
    heading: "Integrations",
    items: [
      { slug: "connecting-tools", label: "Connecting tools" },
      { slug: "google-workspace", label: "Gmail & Google Workspace" },
      { slug: "slack", label: "Slack" },
      { slug: "microsoft-365", label: "Microsoft 365" },
      { slug: "hubspot", label: "HubSpot" },
      { slug: "stripe", label: "Stripe" },
    ],
  },
  {
    heading: "Governance",
    items: [
      { slug: "policy-engine", label: "Policy engine" },
      { slug: "audit-trail", label: "Audit trail" },
      { slug: "security-privacy", label: "Security & privacy" },
    ],
  },
];

const ALL_NAV_ITEMS = DOCS_NAV.flatMap((g) => g.items);

function slugToHref(slug: string) {
  return slug === "" ? "/documents" : `/documents/${slug}`;
}

/* ── Tabs ─────────────────────────────────────────────────────── */

const TABS = [
  { label: "Capabilities", href: "/documents" },
  { label: "Getting started", href: "/documents/getting-started" },
  { label: "Architecture", href: "/documents/platform-architecture" },
  { label: "What's new", href: "#" },
];

/* ── Auto TOC ─────────────────────────────────────────────────── */

function AutoTOC() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      const h2s = document.querySelectorAll("article h2[id]");
      const items = Array.from(h2s).map((h) => ({
        id: h.id,
        text: h.textContent || "",
      }));
      setHeadings(items);
      if (items.length > 0) setActiveId(items[0].id);
    }, 50);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (headings.length === 0) return;
    const ids = headings.map((h) => h.id);
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        for (const id of ids) {
          if (visible.has(id)) {
            setActiveId(id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className="hidden w-[200px] shrink-0 xl:block">
      <nav className="sticky top-[136px] py-10 pr-4">
        <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[1px] text-[var(--ink-muted)]">
          On this page
        </p>
        <div className="space-y-0.5 border-l border-[var(--border)]">
          {headings.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`
                -ml-px block border-l-[2px] py-[3px] pl-3 font-sans text-[12px] leading-snug no-underline transition
                ${
                  activeId === item.id
                    ? "border-[var(--accent)] font-medium text-[var(--ink)]"
                    : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-soft)]"
                }
              `}
            >
              {item.text}
            </a>
          ))}
        </div>
      </nav>
    </aside>
  );
}

/* ── Nav footer (prev / next) ────────────────────────────────── */

function DocNavFooter() {
  const pathname = usePathname();
  const currentSlug =
    pathname === "/documents" ? "" : pathname.replace("/documents/", "");
  const idx = ALL_NAV_ITEMS.findIndex((item) => item.slug === currentSlug);

  const prev = idx > 0 ? ALL_NAV_ITEMS[idx - 1] : undefined;
  const next =
    idx >= 0 && idx < ALL_NAV_ITEMS.length - 1
      ? ALL_NAV_ITEMS[idx + 1]
      : undefined;

  if (!prev && !next) return null;

  return (
    <div className="mt-14 flex items-center justify-between border-t border-[var(--border)] pt-6 pb-16">
      {prev ? (
        <Link
          href={slugToHref(prev.slug)}
          className="group inline-flex items-center gap-2 font-sans text-[14px] font-medium text-[var(--ink-soft)] no-underline transition hover:text-[var(--accent)]"
        >
          <svg
            className="h-4 w-4 transition group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {prev.label}
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={slugToHref(next.slug)}
          className="group inline-flex items-center gap-2 font-sans text-[14px] font-medium text-[var(--ink)] no-underline transition hover:text-[var(--accent)]"
        >
          <span className="text-[11px] font-bold uppercase tracking-[1px] text-[var(--ink-muted)]">
            Next
          </span>
          {next.label}
          <svg
            className="h-4 w-4 transition group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}

/* ── Shell ────────────────────────────────────────────────────── */

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const isActive = (slug: string) => pathname === slugToHref(slug);
  const isTabActive = (href: string) => pathname === href;

  return (
    <>
      {/* Tab bar */}
      <div className="sticky top-16 z-30 border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center gap-1 overflow-x-auto px-6 lg:px-10">
          {TABS.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`
                relative shrink-0 px-4 py-3 font-sans text-[13px] font-medium no-underline transition
                ${
                  isTabActive(tab.href)
                    ? "text-[var(--ink)] after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:bg-[var(--ink)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink-soft)]"
                }
              `}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-112px)]">
        {/* Mobile toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ink)] text-white shadow-lg lg:hidden"
          aria-label="Toggle navigation"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            {sidebarOpen ? (
              <path
                d="M6 18L18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed top-[112px] left-0 z-40 h-[calc(100vh-112px)] w-[260px] shrink-0
            overflow-y-auto border-r border-[var(--border)] bg-white
            px-5 py-6 transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            lg:sticky lg:top-[112px] lg:block lg:translate-x-0
          `}
        >
          <nav className="space-y-5">
            {DOCS_NAV.map((group) => (
              <div key={group.heading}>
                <p className="mb-1 font-sans text-[11px] font-bold uppercase tracking-[1px] text-[var(--ink-muted)]">
                  {group.heading}
                </p>
                <div className="space-y-px">
                  {group.items.map((item) => (
                    <Link
                      key={item.slug}
                      href={slugToHref(item.slug)}
                      className={`
                        block py-[5px] pl-2.5 font-sans text-[13px] no-underline transition
                        ${
                          isActive(item.slug)
                            ? "border-l-[2px] border-[var(--accent)] font-semibold text-[var(--ink)]"
                            : "border-l-[2px] border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]"
                        }
                      `}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-6 py-10 sm:px-10 lg:px-16">
          <article className="mx-auto max-w-[680px]">
            {children}
            <DocNavFooter />
          </article>
        </main>

        <AutoTOC />
      </div>
    </>
  );
}
