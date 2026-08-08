import { NextRequest, NextResponse } from "next/server";
import { runCycle } from "@/lib/cycle";

// A manual cycle can include live-source reads, several scout evaluations, and
// a writer/architect pass. Give it enough time to finish rather than silently
// timing out while the UI is waiting.
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  try {
    // In development or same-origin browser triggers, allow running smoothly
    const isDev = process.env.NODE_ENV === "development";
    const secret = request.headers.get("x-cron-secret");
    const expected = process.env.CRON_SECRET;
    const origin = request.headers.get("origin") || "";
    const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
    const isSameOriginBrowserRequest = Boolean(origin) && origin === request.nextUrl.origin;

    // The Run Once button is a same-origin browser request. Cron callers still
    // require the configured secret outside development.
    if (!isDev && !isLocalhost && !isSameOriginBrowserRequest && (!expected || secret !== expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cycle] Cycle triggered via API / Web UI...");
    const result = await runCycle();
    console.log("[Cycle] Complete:", result);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Cycle] Error:", err);
    return NextResponse.json(
      {
        error: "Cycle failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
