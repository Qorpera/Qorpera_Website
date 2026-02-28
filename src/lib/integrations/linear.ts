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

export async function listProjects(token: string, first = 20) {
  return linearQuery(
    token,
    `query { projects(first: ${first}) { nodes { id name description state startDate targetDate lead { name } teams { nodes { name } } } } }`,
  );
}

export async function createProject(token: string, teamIds: string[], name: string, description?: string) {
  return linearQuery(
    token,
    `mutation CreateProject($input: ProjectCreateInput!) { projectCreate(input: $input) { success project { id name url } } }`,
    { input: { name, teamIds, ...(description ? { description } : {}) } },
  );
}

export async function listLabels(token: string, first = 50) {
  return linearQuery(
    token,
    `query { issueLabels(first: ${first}) { nodes { id name color } } }`,
  );
}

export async function createComment(token: string, issueId: string, body: string) {
  return linearQuery(
    token,
    `mutation CreateComment($input: CommentCreateInput!) { commentCreate(input: $input) { success comment { id body createdAt } } }`,
    { input: { issueId, body } },
  );
}

export async function addAttachment(token: string, issueId: string, url: string, title: string) {
  return linearQuery(
    token,
    `mutation AddAttachment($input: AttachmentCreateInput!) { attachmentCreate(input: $input) { success attachment { id title url } } }`,
    { input: { issueId, url, title } },
  );
}

export async function listCycles(token: string, teamId: string, first = 10) {
  return linearQuery(
    token,
    `query($teamId: String!) { cycles(filter: { team: { id: { eq: $teamId } } }, first: ${first}, orderBy: createdAt) { nodes { id number name startsAt endsAt completedAt } } }`,
    { teamId },
  );
}

export async function createCycle(token: string, teamId: string, name: string, startsAt: string, endsAt: string) {
  return linearQuery(
    token,
    `mutation CreateCycle($input: CycleCreateInput!) { cycleCreate(input: $input) { success cycle { id number name } } }`,
    { input: { teamId, name, startsAt, endsAt } },
  );
}

export async function getRoadmap(token: string, first = 10) {
  return linearQuery(
    token,
    `query { roadmaps(first: ${first}) { nodes { id name description projects { nodes { id name state } } } } }`,
  );
}

export async function updateProject(token: string, projectId: string, input: Record<string, unknown>) {
  return linearQuery(
    token,
    `mutation UpdateProject($id: String!, $input: ProjectUpdateInput!) { projectUpdate(id: $id, input: $input) { success project { id name state } } }`,
    { id: projectId, input },
  );
}

export async function getIssueHistory(token: string, issueId: string) {
  return linearQuery(
    token,
    `query($id: String!) { issue(id: $id) { id title history(first: 20) { nodes { id createdAt fromState { name } toState { name } actor { name } } } } }`,
    { id: issueId },
  );
}
