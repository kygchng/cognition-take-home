import { getDevinClient } from "./devin";
import { createSession, listKnowledgeDevinIds } from "./db";
import type { DbIssue, DbAnalysis, ConversationMessage } from "./types";

function buildExecutePrompt(
  issue: DbIssue,
  analysis: DbAnalysis,
  conversation: ConversationMessage[]
): string {
  const plan = (analysis.proposed_plan as string[])
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");
  const files = (analysis.files_to_change as string[]).join("\n- ");
  const conversationBlock =
    conversation.length > 0
      ? `\n\nReviewer conversation prior to approval:\n${conversation
          .map((m) => `[${m.role === "user" ? "Reviewer" : "Devin"}]: ${m.content}`)
          .join("\n")}`
      : "";

  return `Implement the fix for the following GitHub issue in the Apache Superset repository.

Issue #${issue.number}: ${issue.title}
URL: ${issue.url}
Classification: ${issue.classified_as ?? "code-quality"}

Body:
${issue.body ?? "(no description provided)"}

Analysis Summary:
${analysis.summary}

Implementation Plan:
${plan}

Files to change:
- ${files}${conversationBlock}

Instructions:
- Follow the implementation plan exactly
- Make only the changes described — do not refactor unrelated code
- Ensure all existing tests pass (npm run test in superset-frontend, pytest for backend)
- Run pre-commit validation: pre-commit run --all-files
- Open a pull request against the main branch when complete
- PR title must follow Conventional Commits format: type(scope): description`;
}

export async function triggerExecuteSession(
  analyzeSessionId: string,
  issue: DbIssue,
  analysis: DbAnalysis,
  conversation: ConversationMessage[]
): Promise<string> {
  const client = getDevinClient();
  const knowledgeIds = await listKnowledgeDevinIds();

  const { session_id, url } = await client.createSession({
    prompt: buildExecutePrompt(issue, analysis, conversation),
    title: `[Execute] #${issue.number}: ${issue.title.slice(0, 60)}`,
    tags: ["auto-remediate", "execute", `issue-${issue.number}`],
    ...(knowledgeIds.length > 0 && { knowledge_ids: knowledgeIds }),
    max_acu_limit: 20,
  });

  await createSession({
    devin_session_id: session_id,
    kind: "execute",
    parent_session_id: analyzeSessionId,
    issue_number: issue.number,
    status: "running",
    devin_url: url,
  });

  return session_id;
}
