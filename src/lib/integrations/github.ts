/**
 * GitHub integration helpers (REST API v3)
 */

const GH_API = "https://api.github.com";

async function ghFetch(token: string, path: string, opts?: RequestInit) {
  const res = await fetch(`${GH_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(opts?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null) as { message?: string } | null;
    throw new Error(`GitHub API ${res.status}: ${err?.message ?? res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function getAuthenticatedUser(token: string) {
  return ghFetch(token, "/user") as Promise<{
    login: string;
    name: string | null;
    email: string | null;
    company: string | null;
  }>;
}

export async function listRepos(token: string, perPage = 20) {
  return ghFetch(token, `/user/repos?sort=updated&per_page=${perPage}&affiliation=owner,collaborator`) as Promise<
    Array<{ id: number; full_name: string; description: string | null; private: boolean; default_branch: string; language: string | null; open_issues_count: number }>
  >;
}

export async function listIssues(token: string, repo: string, state: "open" | "closed" | "all" = "open", perPage = 20) {
  return ghFetch(token, `/repos/${repo}/issues?state=${state}&per_page=${perPage}&sort=updated`) as Promise<
    Array<{ number: number; title: string; state: string; body: string | null; user: { login: string }; labels: Array<{ name: string }>; assignees: Array<{ login: string }>; created_at: string; updated_at: string }>
  >;
}

export async function createIssue(token: string, repo: string, data: { title: string; body?: string; labels?: string[]; assignees?: string[] }) {
  return ghFetch(token, `/repos/${repo}/issues`, {
    method: "POST",
    body: JSON.stringify(data),
  }) as Promise<{ number: number; html_url: string; title: string }>;
}

export async function listPullRequests(token: string, repo: string, state: "open" | "closed" | "all" = "open", perPage = 20) {
  return ghFetch(token, `/repos/${repo}/pulls?state=${state}&per_page=${perPage}&sort=updated`) as Promise<
    Array<{ number: number; title: string; state: string; body: string | null; user: { login: string }; head: { ref: string }; base: { ref: string }; created_at: string; updated_at: string }>
  >;
}

export async function getRepo(token: string, repo: string) {
  return ghFetch(token, `/repos/${repo}`) as Promise<{
    full_name: string;
    description: string | null;
    private: boolean;
    default_branch: string;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    language: string | null;
  }>;
}

export async function listOrgs(token: string) {
  return ghFetch(token, "/user/orgs") as Promise<Array<{ login: string; description: string | null }>>;
}
