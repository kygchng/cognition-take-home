import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@/lib/webhook";
import { upsertIssue, getIssueByNumber } from "@/lib/db";
import { triggerAnalyzeSession } from "@/lib/analyze";
import type { IssueClassification } from "@/lib/types";

export const dynamic = "force-dynamic";

function classify(title: string, body: string | null): IssueClassification {
  const text = `${title} ${body ?? ""}`.toLowerCase();
  if (/cve|vulnerability|ghsa|security advisory/.test(text)) return "vulnerability";
  if (/bump|upgrade|update.*dep|dependency|dependenc/.test(text)) return "dep-upgrade";
  return "code-quality";
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(rawBody);

  if (event !== "issues") {
    return NextResponse.json({ skipped: true });
  }

  const isLabeledTrigger =
    payload.action === "labeled" && payload.label?.name === "auto-remediate";
  const isOpenedWithLabel =
    payload.action === "opened" &&
    payload.issue?.labels?.some((l: { name: string }) => l.name === "auto-remediate");

  if (!isLabeledTrigger && !isOpenedWithLabel) {
    return NextResponse.json({ skipped: true });
  }

  const issue = payload.issue;
  const classifiedAs = classify(issue.title, issue.body);

  await upsertIssue({
    number: issue.number,
    title: issue.title,
    body: issue.body ?? null,
    url: issue.html_url,
    classified_as: classifiedAs,
  });

  const dbIssue = await getIssueByNumber(issue.number);
  if (!dbIssue) {
    return NextResponse.json(
      { error: "Failed to retrieve issue after upsert" },
      { status: 500 }
    );
  }

  let analyzeSessionId: string | null = null;
  try {
    analyzeSessionId = await triggerAnalyzeSession(dbIssue);
  } catch (err) {
    console.error("Failed to trigger analyze session:", err);
  }

  return NextResponse.json({
    received: true,
    issueNumber: issue.number,
    classifiedAs,
    analyzeSessionId,
  });
}
