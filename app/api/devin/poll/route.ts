import { NextResponse } from "next/server";
import { pollRunningSessions } from "@/lib/poll";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await pollRunningSessions();
  return NextResponse.json(result);
}
