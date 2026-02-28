/**
 * Notion integration helpers (API v1)
 * Docs: https://developers.notion.com/reference/intro
 */

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

async function notionFetch(token: string, path: string, opts?: RequestInit) {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(opts?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null) as { message?: string } | null;
    throw new Error(`Notion API ${res.status}: ${err?.message ?? res.statusText}`);
  }
  return res.json();
}

type NotionRichText = Array<{ plain_text?: string }>;
type NotionBlockContent = { rich_text?: NotionRichText; title?: NotionRichText };

function extractPlainText(richText?: NotionRichText): string {
  return richText?.map((t) => t.plain_text ?? "").join("") ?? "";
}

export async function getWorkspaceInfo(token: string) {
  return notionFetch(token, "/users/me") as Promise<{
    id: string;
    name: string;
    workspace_name?: string;
    bot?: { workspace_name?: string };
  }>;
}

export async function searchPages(token: string, query: string, pageSize = 10) {
  const data = (await notionFetch(token, "/search", {
    method: "POST",
    body: JSON.stringify({ query, filter: { value: "page", property: "object" }, page_size: pageSize }),
  })) as {
    results: Array<{
      id: string;
      properties?: Record<string, { title?: NotionRichText }>;
      url?: string;
      created_time: string;
      last_edited_time: string;
    }>;
  };

  return data.results.map((page) => {
    const titleProp = Object.values(page.properties ?? {}).find((p) => p.title);
    const title = titleProp?.title ? extractPlainText(titleProp.title) : "Untitled";
    return { id: page.id, title, url: page.url, createdAt: page.created_time, editedAt: page.last_edited_time };
  });
}

export async function searchDatabases(token: string, query: string, pageSize = 10) {
  const data = (await notionFetch(token, "/search", {
    method: "POST",
    body: JSON.stringify({ query, filter: { value: "database", property: "object" }, page_size: pageSize }),
  })) as {
    results: Array<{
      id: string;
      title?: NotionRichText;
      url?: string;
      created_time: string;
    }>;
  };

  return data.results.map((db) => ({
    id: db.id,
    title: extractPlainText(db.title),
    url: db.url,
    createdAt: db.created_time,
  }));
}

export async function readPage(token: string, pageId: string) {
  const page = (await notionFetch(token, `/pages/${pageId}`)) as {
    id: string;
    properties?: Record<string, { title?: NotionRichText; rich_text?: NotionRichText; number?: number | null; checkbox?: boolean; select?: { name: string } | null }>;
    url?: string;
    created_time: string;
    last_edited_time: string;
  };

  // Fetch block children for content
  const blocksData = (await notionFetch(token, `/blocks/${pageId}/children?page_size=50`)) as {
    results: Array<{ type: string; [key: string]: unknown }>;
  };

  const contentLines: string[] = [];
  for (const block of blocksData.results) {
    const blockType = block.type as string;
    const blockContent = block[blockType] as BlockContent | undefined;
    const text = extractPlainText(blockContent?.rich_text ?? blockContent?.title);
    if (text) contentLines.push(text);
  }

  const titleProp = Object.values(page.properties ?? {}).find((p) => p.title);
  const title = titleProp?.title ? extractPlainText(titleProp.title) : "Untitled";

  return {
    id: page.id,
    title,
    url: page.url,
    content: contentLines.join("\n"),
    createdAt: page.created_time,
    editedAt: page.last_edited_time,
  };
}

type BlockContent = { rich_text?: NotionRichText; title?: NotionRichText };

export async function createPage(token: string, params: {
  parentPageId?: string;
  parentDatabaseId?: string;
  title: string;
  content?: string;
}) {
  const parent = params.parentDatabaseId
    ? { database_id: params.parentDatabaseId }
    : { page_id: params.parentPageId ?? "" };

  const children = params.content
    ? params.content.split("\n").filter(Boolean).slice(0, 50).map((line) => ({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: line.slice(0, 2000) } }],
        },
      }))
    : [];

  const properties = params.parentDatabaseId
    ? { Name: { title: [{ type: "text", text: { content: params.title } }] } }
    : { title: [{ type: "text", text: { content: params.title } }] };

  const page = (await notionFetch(token, "/pages", {
    method: "POST",
    body: JSON.stringify({ parent, properties, children }),
  })) as { id: string; url?: string };

  return { id: page.id, url: page.url };
}

export async function appendBlocks(token: string, pageId: string, content: string) {
  const lines = content.split("\n").filter(Boolean).slice(0, 50);
  const children = lines.map((line) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: line.slice(0, 2000) } }],
    },
  }));

  await notionFetch(token, `/blocks/${pageId}/children`, {
    method: "PATCH",
    body: JSON.stringify({ children }),
  });

  return { success: true, blocksAdded: children.length };
}
