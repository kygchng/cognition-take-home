import { NextRequest, NextResponse } from "next/server";
import {
  getIssueByNumber,
  getAnalysisByIssue,
  approveAnalysis,
  appendConversationMessage,
  listSessionsForIssue,
} from "@/lib/db";
import { triggerExecuteSession } from "@/lib/execute";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { number: string } }
) {
  const issueNumber = parseInt(params.number);
  if (isNaN(issueNumber)) {
    return NextResponse.json({ error: "Invalid issue number" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const userMessage: string | undefined =
    typeof body.userMessage === "string" && body.userMessage.trim()
      ? body.userMessage.trim()
      : undefined;

  const [issue, analysis] = await Promise.all([
    getIssueByNumber(issueNumber),
    getAnalysisByIssue(issueNumber),
  ]);

  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }
  if (!analysis) {
    return NextResponse.json(
      { error: "No analysis found for this issue" },
      { status: 404 }
    );
  }
  if (analysis.approved_at) {
    return NextResponse.json({ error: "Already approved" }, { status: 409 });
  }

  const existingSessions = await listSessionsForIssue(issueNumber);
  const alreadyExecuting = existingSessions.some(
    (s) => s.kind === "execute" && s.status === "running"
  );
  if (alreadyExecuting) {
    return NextResponse.json(
      { error: "Execute session already running" },
      { status: 409 }
    );
  }

  if (userMessage) {
    await appendConversationMessage(analysis.session_id, userMessage, "user");
  }

  await approveAnalysis(analysis.session_id);

  const messages = userMessage
    ? [...analysis.user_messages, { role: "user" as const, content: userMessage, timestamp: new Date().toISOString() }]
    : analysis.user_messages;

  const executeSessionId = await triggerExecuteSession(
    analysis.session_id,
    issue,
    analysis,
    messages
  );

  return NextResponse.json({ executeSessionId });
}
