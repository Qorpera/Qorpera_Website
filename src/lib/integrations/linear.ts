const LINEAR_GRAPHQL = "https://api.linear.app/graphql";

async function linearQuery(
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(LINEAR_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10000),
  });
  const data = (await res.json()) as {
    data?: unknown;
    errors?: Array<{ message: string }>;
  };
  if (data.errors?.length) {
    throw new Error(`Linear API error: ${data.errors[0].message}`);
  }
  return data.data;
}

export async function listTeams(token: string) {
  return linearQuery(token, `query { teams { nodes { id name key } } }`);
}

export async function listIssues(token: string, teamId?: string, first = 20) {
  const filter = teamId
    ? `(filter: { team: { id: { eq: "${teamId}" } } }, first: ${first})`
    : `(first: ${first})`;
  return linearQuery(
    token,
    `query { issues${filter} { nodes { id title description state { name } priority assignee { name } team { name } createdAt } } }`,
  );
}

export async function createIssue(
  token: string,
  teamId: string,
  title: string,
  description?: string,
  priority?: number,
  assigneeId?: string,
) {
  return linearQuery(
    token,
    `mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id title url } } }`,
    {
      input: {
        teamId,
        title,
        ...(description ? { description } : {}),
        ...(priority != null ? { priority } : {}),
        ...(assigneeId ? { assigneeId } : {}),
      },
    },
  );
}

export async function updateIssue(
  token: string,
  issueId: string,
  input: Record<string, unknown>,
) {
  return linearQuery(
    token,
    `mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { id title state { name } } } }`,
    { id: issueId, input },
  );
}
