import { Octokit } from "@octokit/rest";

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  return new Octokit({ auth: token });
}

export async function getIssue(
  repo: string,
  number: number
): Promise<{ number: number; title: string; body: string | null; url: string }> {
  const [owner, repoName] = repo.split("/");
  const octokit = getOctokit();
  const { data } = await octokit.issues.get({
    owner,
    repo: repoName,
    issue_number: number,
  });
  return {
    number: data.number,
    title: data.title,
    body: data.body ?? null,
    url: data.html_url,
  };
}

export async function listOpenIssues(
  repo: string
): Promise<{ number: number; title: string; body: string | null; url: string; labels: string[] }[]> {
  const [owner, repoName] = repo.split("/");
  const octokit = getOctokit();
  const { data } = await octokit.issues.listForRepo({
    owner,
    repo: repoName,
    state: "open",
    per_page: 100,
  });
  return data.map((issue) => ({
    number: issue.number,
    title: issue.title,
    body: issue.body ?? null,
    url: issue.html_url,
    labels: issue.labels
      .map((l) => (typeof l === "string" ? l : l.name ?? ""))
      .filter(Boolean),
  }));
}
