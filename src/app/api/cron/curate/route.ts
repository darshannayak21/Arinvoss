import { NextRequest, NextResponse } from "next/server";
import { runCurationCycle } from "@/lib/pipeline/curator";

export const dynamic = "force-dynamic";

/**
 * Curation Cron Endpoint
 * Scheduled via Render Native Cron or External Scheduler: 0 8 * * * (8:00 AM UTC)
 * Scrapes sources, selects top 2 ideas, and queues them in Supabase.
 */
export async function GET(request: NextRequest) {
  return handleCuration(request);
}

export async function POST(request: NextRequest) {
  return handleCuration(request);
}

async function handleCuration(request: NextRequest) {
  try {
    const result = await runCurationCycle();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API Cron Curate] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
