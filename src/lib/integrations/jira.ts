/**
 * Jira (Atlassian) integration wrapper — 12 operations.
 */

const JIRA_API = "https://api.atlassian.com/ex/jira";

async function jiraFetch(token: string, cloudId: string, path: string, opts?: RequestInit) {
  const res = await fetch(`${JIRA_API}/${cloudId}/rest/api/3${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json", ...(opts?.headers as Record<string, string>) },
  });
  if (!res.ok) throw new Error(`Jira API ${path} failed (${res.status})`);
  return res.json();
}

export async function listProjects(token: string, cloudId: string) {
  return jiraFetch(token, cloudId, "/project/search?maxResults=50");
}

export async function listBoards(token: string, cloudId: string) {
  const res = await fetch(`${JIRA_API}/${cloudId}/rest/agile/1.0/board?maxResults=50`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Jira boards failed (${res.status})`);
  return res.json();
}

export async function listSprints(token: string, cloudId: string, boardId: string) {
  const res = await fetch(`${JIRA_API}/${cloudId}/rest/agile/1.0/board/${boardId}/sprint?state=active,future&maxResults=20`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Jira sprints failed (${res.status})`);
  return res.json();
}

export async function listIssues(token: string, cloudId: string, jql: string, maxResults = 20) {
  return jiraFetch(token, cloudId, `/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,status,assignee,priority,issuetype`);
}

export async function getIssue(token: string, cloudId: string, issueIdOrKey: string) {
  return jiraFetch(token, cloudId, `/issue/${issueIdOrKey}`);
}

export async function createIssue(token: string, cloudId: string, projectKey: string, summary: string, issueType: string, description?: string) {
  return jiraFetch(token, cloudId, "/issue", {
    method: "POST",
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary,
        issuetype: { name: issueType },
        ...(description && { description: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: description }] }] } }),
      },
    }),
  });
}

export async function updateIssue(token: string, cloudId: string, issueIdOrKey: string, fields: Record<string, unknown>) {
  return jiraFetch(token, cloudId, `/issue/${issueIdOrKey}`, {
    method: "PUT",
    body: JSON.stringify({ fields }),
  });
}

export async function addComment(token: string, cloudId: string, issueIdOrKey: string, body: string) {
  return jiraFetch(token, cloudId, `/issue/${issueIdOrKey}/comment`, {
    method: "POST",
    body: JSON.stringify({
      body: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: body }] }] },
    }),
  });
}

export async function transitionIssue(token: string, cloudId: string, issueIdOrKey: string, transitionId: string) {
  return jiraFetch(token, cloudId, `/issue/${issueIdOrKey}/transitions`, {
    method: "POST",
    body: JSON.stringify({ transition: { id: transitionId } }),
  });
}

export async function listTransitions(token: string, cloudId: string, issueIdOrKey: string) {
  return jiraFetch(token, cloudId, `/issue/${issueIdOrKey}/transitions`);
}

export async function assignIssue(token: string, cloudId: string, issueIdOrKey: string, accountId: string) {
  return jiraFetch(token, cloudId, `/issue/${issueIdOrKey}/assignee`, {
    method: "PUT",
    body: JSON.stringify({ accountId }),
  });
}

export async function searchUsers(token: string, cloudId: string, query: string) {
  return jiraFetch(token, cloudId, `/user/search?query=${encodeURIComponent(query)}&maxResults=20`);
}
