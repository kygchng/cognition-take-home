import { NextRequest, NextResponse } from "next/server";
import { getDevinClient } from "@/lib/devin";
import { listSessions } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const client = getDevinClient();
    const raw = await fetch(
      `https://api.devin.ai/v1/session/${id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DEVIN_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const body = await raw.json().catch(() => null);
    return NextResponse.json({ status: raw.status, ok: raw.ok, body });
  }

  const sessions = await listSessions();
  const running = sessions.filter((s) => s.status === "running");

  const client = getDevinClient();
  const results = await Promise.all(
    running.map(async (s) => {
      try {
        const raw = await fetch(
          `https://api.devin.ai/v1/session/${s.devin_session_id}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.DEVIN_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        const body = await raw.json().catch(() => null);
        return { session_id: s.devin_session_id, http_status: raw.status, body };
      } catch (err) {
        return { session_id: s.devin_session_id, error: String(err) };
      }
    })
  );

  void client;
  return NextResponse.json(results);
}
