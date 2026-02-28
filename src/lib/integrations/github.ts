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

export async function createPullRequest(token: string, repo: string, data: { title: string; body?: string; head: string; base: string; draft?: boolean }) {
  return ghFetch(token, `/repos/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify(data),
  }) as Promise<{ number: number; html_url: string; title: string }>;
}

export async function mergePullRequest(token: string, repo: string, pullNumber: number, mergeMethod: "merge" | "squash" | "rebase" = "merge") {
  return ghFetch(token, `/repos/${repo}/pulls/${pullNumber}/merge`, {
    method: "PUT",
    body: JSON.stringify({ merge_method: mergeMethod }),
  });
}

export async function listWorkflowRuns(token: string, repo: string, perPage = 10) {
  return ghFetch(token, `/repos/${repo}/actions/runs?per_page=${perPage}`) as Promise<{
    total_count: number;
    workflow_runs: Array<{ id: number; name: string; status: string; conclusion: string | null; created_at: string; html_url: string }>;
  }>;
}

export async function triggerWorkflow(token: string, repo: string, workflowId: string | number, ref: string, inputs?: Record<string, string>) {
  return ghFetch(token, `/repos/${repo}/actions/workflows/${workflowId}/dispatches`, {
    method: "POST",
    body: JSON.stringify({ ref, ...(inputs ? { inputs } : {}) }),
  });
}

export async function addLabel(token: string, repo: string, issueNumber: number, labels: string[]) {
  return ghFetch(token, `/repos/${repo}/issues/${issueNumber}/labels`, {
    method: "POST",
    body: JSON.stringify({ labels }),
  });
}

export async function updateIssue(token: string, repo: string, issueNumber: number, data: { title?: string; body?: string; state?: "open" | "closed"; labels?: string[]; assignees?: string[] }) {
  return ghFetch(token, `/repos/${repo}/issues/${issueNumber}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function createComment(token: string, repo: string, issueNumber: number, body: string) {
  return ghFetch(token, `/repos/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  }) as Promise<{ id: number; html_url: string }>;
}

export async function listBranches(token: string, repo: string, perPage = 30) {
  return ghFetch(token, `/repos/${repo}/branches?per_page=${perPage}`) as Promise<
    Array<{ name: string; protected: boolean; commit: { sha: string } }>
  >;
}

export async function getCommit(token: string, repo: string, ref: string) {
  return ghFetch(token, `/repos/${repo}/commits/${ref}`) as Promise<{
    sha: string; commit: { message: string; author: { name: string; date: string } }; stats?: { additions: number; deletions: number };
  }>;
}

export async function compareCommits(token: string, repo: string, base: string, head: string) {
  return ghFetch(token, `/repos/${repo}/compare/${base}...${head}`) as Promise<{
    status: string; ahead_by: number; behind_by: number; total_commits: number;
    commits: Array<{ sha: string; commit: { message: string } }>;
    files: Array<{ filename: string; status: string; additions: number; deletions: number }>;
  }>;
}
