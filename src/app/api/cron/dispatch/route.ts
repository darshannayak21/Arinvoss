import { NextRequest, NextResponse } from "next/server";
import { runDispatchCycle } from "@/lib/pipeline/dispatcher";

export const dynamic = "force-dynamic";

/**
 * Dispatch Cron Endpoint
 * Scheduled via Render Native Cron or External Scheduler: 0 11,18 * * * (11:00 AM & 6:00 PM UTC)
 * Pops oldest QUEUED post, validates diagram PNG, dispatches to Make.com, and marks PUBLISHED.
 */
export async function GET(request: NextRequest) {
  return handleDispatch(request);
}

export async function POST(request: NextRequest) {
  return handleDispatch(request);
}

async function handleDispatch(request: NextRequest) {
  try {
    const result = await runDispatchCycle();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API Cron Dispatch] Error:", err);
    return NextResponse.json(
      {
        published: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
