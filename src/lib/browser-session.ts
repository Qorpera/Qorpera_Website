import type { Page, BrowserContext } from "playwright";

export type PageState = {
  url: string;
  title: string;
  text: string;
  inputs: string[];
  links: string[];
};

type SessionEntry = {
  context: BrowserContext;
  page: Page;
  lastUsed: number;
};

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SESSIONS = 10;

const pool = new Map<string, SessionEntry>();

function purgeStale(): void {
  const now = Date.now();
  for (const [id, entry] of pool.entries()) {
    if (now - entry.lastUsed > SESSION_TTL_MS) {
      entry.context.close().catch(() => {});
      pool.delete(id);
    }
  }
}

function evictLru(): void {
  let oldest: string | null = null;
  let oldestTime = Infinity;
  for (const [id, entry] of pool.entries()) {
    if (entry.lastUsed < oldestTime) {
      oldestTime = entry.lastUsed;
      oldest = id;
    }
  }
  if (oldest) {
    pool.get(oldest)!.context.close().catch(() => {});
    pool.delete(oldest);
  }
}

export async function getOrCreateSession(sessionId: string): Promise<Page> {
  purgeStale();

  const existing = pool.get(sessionId);
  if (existing) {
    existing.lastUsed = Date.now();
    return existing.page;
  }

  if (pool.size >= MAX_SESSIONS) {
    evictLru();
  }

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Qorpera-Agent/1.0",
  });

  const page = await context.newPage();

  pool.set(sessionId, { context, page, lastUsed: Date.now() });
  return page;
}

export async function closeSession(sessionId: string): Promise<void> {
  const entry = pool.get(sessionId);
  if (entry) {
    await entry.context.close().catch(() => {});
    pool.delete(sessionId);
  }
}

export async function extractPageState(page: Page): Promise<PageState> {
  const url = page.url();
  const title = await page.title().catch(() => "");

  const text = await page
    .evaluate(() => {
      // Remove script/style elements from text extraction
      const clone = document.body.cloneNode(true) as HTMLElement;
      for (const el of clone.querySelectorAll("script, style, noscript, svg")) {
        el.remove();
      }
      return (clone.innerText || clone.textContent || "").replace(/\s+/g, " ").trim();
    })
    .catch(() => "");

  const inputs = await page
    .evaluate(() => {
      const els = Array.from(
        document.querySelectorAll("input:not([type=hidden]), textarea, select"),
      );
      return els.slice(0, 20).map((el) => {
        const e = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const label = document.querySelector(`label[for="${e.id}"]`)?.textContent?.trim() || "";
        return `${e.tagName.toLowerCase()}[${e.type || "text"}]${e.name ? ` name="${e.name}"` : ""}${label ? ` label="${label}"` : ""}`;
      });
    })
    .catch(() => [] as string[]);

  const links = await page
    .evaluate(() => {
      return Array.from(document.querySelectorAll("a[href]"))
        .slice(0, 30)
        .map((a) => {
          const anchor = a as HTMLAnchorElement;
          return `${anchor.textContent?.trim() || "(no text)"} → ${anchor.href}`;
        });
    })
    .catch(() => [] as string[]);

  return {
    url,
    title,
    text: text.slice(0, 4000),
    inputs,
    links,
  };
}
