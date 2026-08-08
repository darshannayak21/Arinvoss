import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "@/lib/store";
import { isSchedulerRunning } from "@/lib/scheduler";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const persona = body?.persona;

    if (!persona?.name || !persona?.domain) {
      return NextResponse.json(
        { error: "Missing persona.name or persona.domain" },
        { status: 400 }
      );
    }

    const agentId = createAgent(persona.name, persona.domain);

    console.log(
      `[Init] Agent ${agentId}: ${persona.name} — ${persona.domain}`
    );
    console.log(
      `[Init] Scheduler status: ${isSchedulerRunning() ? "RUNNING" : "STOPPED"}`
    );

    return NextResponse.json({ agentId, schedulerRunning: isSchedulerRunning() });
  } catch (err) {
    console.error("[Init] Error:", err);
    return NextResponse.json(
      { error: "Failed to initialize agent" },
      { status: 500 }
    );
  }
}
