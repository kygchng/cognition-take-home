import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAnalysisByIssue, appendConversationMessage } from "@/lib/db";
import { getDevinClient } from "@/lib/devin";

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
  const message: string | undefined =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim()
      : undefined;

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const analysis = await getAnalysisByIssue(issueNumber);
  if (!analysis) {
    return NextResponse.json({ error: "No analysis found" }, { status: 404 });
  }
  if (analysis.approved_at) {
    return NextResponse.json(
      { error: "Analysis already approved, cannot add messages" },
      { status: 409 }
    );
  }

  await appendConversationMessage(analysis.session_id, message, "user");

  try {
    const client = getDevinClient();
    await client.sendMessage(analysis.session_id, message);
  } catch (err) {
    console.error("[message] Failed to forward message to Devin:", err);
  }

  revalidatePath(`/issues/${issueNumber}`);
  return NextResponse.json({ ok: true });
}
