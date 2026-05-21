import { getDevinClient } from "./devin";
import { createSession, listKnowledgeDevinIds } from "./db";
import type { DbIssue } from "./types";

const RISK_CARD_SCHEMA = {
  type: "object",
  required: ["summary", "plan", "filesToChange", "riskFactors", "estimatedScope"],
  properties: {
    summary: { type: "string" },
    plan: { type: "array", items: { type: "string" } },
    filesToChange: { type: "array", items: { type: "string" } },
    riskFactors: {
      type: "array",
      items: {
        type: "object",
        required: ["category", "description", "severity"],
        properties: {
          category: {
            type: "string",
            enum: [
              "breaking-change",
              "test-coverage",
              "scope",
              "ambiguity",
              "external-dependency",
            ],
          },
          description: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    estimatedScope: { type: "string", enum: ["small", "medium", "large"] },
  },
};

function buildAnalyzePrompt(issue: DbIssue): string {
  return `You are analyzing a GitHub issue for the Apache Superset codebase to produce a structured remediation plan.

Issue #${issue.number}: ${issue.title}
URL: ${issue.url}
Classification: ${issue.classified_as ?? "code-quality"}

Body:
${issue.body ?? "(no description provided)"}

Your task:
- Explore the Superset repository to understand the relevant code areas
- Do NOT make any code changes during this analysis
- Identify all files that would need to change and why
- Produce a concrete step-by-step implementation plan
- Assess risks: breaking changes, missing test coverage, scope creep, ambiguous requirements, external dependencies
- Estimate scope: small (< 1 day), medium (1–3 days), large (> 3 days)

IMPORTANT: Complete this analysis fully and autonomously. Do not pause to ask for clarification or wait for user input. If the issue lacks detail, note it as an ambiguity risk factor with high severity and make reasonable assumptions. Always produce the structured output and end the session.`;
}

export async function triggerAnalyzeSession(issue: DbIssue): Promise<string> {
  const client = getDevinClient();
  const knowledgeIds = await listKnowledgeDevinIds();

  const { session_id, url } = await client.createSession({
    prompt: buildAnalyzePrompt(issue),
    title: `[Analyze] #${issue.number}: ${issue.title.slice(0, 60)}`,
    tags: ["auto-remediate", "analyze", `issue-${issue.number}`],
    ...(knowledgeIds.length > 0 && { knowledge_ids: knowledgeIds }),
    structured_output_schema: RISK_CARD_SCHEMA,
    max_acu_limit: 5,
  });

  await createSession({
    devin_session_id: session_id,
    kind: "analyze",
    issue_number: issue.number,
    status: "running",
    devin_url: url,
  });

  return session_id;
}
