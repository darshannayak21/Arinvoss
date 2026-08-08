import { NextRequest, NextResponse } from "next/server";
import { startScheduler, stopScheduler, isSchedulerRunning, getCycleCount } from "@/lib/scheduler";

export async function GET() {
  return NextResponse.json({
    running: isSchedulerRunning(),
    cycleCount: getCycleCount(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action; // "start" | "stop" | "toggle"
    const intervalMinutes = 8 * 60;

    if (action === "start") {
      startScheduler(intervalMinutes);
    } else if (action === "stop") {
      stopScheduler();
    } else if (action === "toggle") {
      if (isSchedulerRunning()) {
        stopScheduler();
      } else {
        startScheduler(intervalMinutes);
      }
    }

    return NextResponse.json({
      success: true,
      running: isSchedulerRunning(),
      cycleCount: getCycleCount(),
    });
  } catch (err) {
    console.error("[Scheduler API] Error:", err);
    return NextResponse.json(
      { error: "Failed to update scheduler state" },
      { status: 500 }
    );
  }
}
