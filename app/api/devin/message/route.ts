import { NextRequest, NextResponse } from "next/server";
import { getDevinClient } from "@/lib/devin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { session_id, message } = await req.json();
  if (!session_id || !message) {
    return NextResponse.json(
      { error: "session_id and message are required" },
      { status: 400 }
    );
  }
  const client = getDevinClient();
  await client.sendMessage(session_id, message);
  return NextResponse.json({ sent: true });
}
