import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pollRunningSessions } from "@/lib/poll";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await pollRunningSessions();
  if (result.updated > 0) {
    revalidatePath("/", "layout");
  }
  return NextResponse.json(result);
}
