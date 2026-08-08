import { NextRequest, NextResponse } from "next/server";
import { getBacklog, getAgent } from "@/lib/store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    if (agentId) {
      const agent = getAgent(agentId);
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    const backlog = getBacklog(agentId ?? undefined);

    return NextResponse.json({
      count: backlog.length,
      backlog: backlog.map((b) => ({
        id: b.id,
        title: b.item.title,
        source: b.item.sourceName,
        url: b.item.url,
        score: b.score,
        scoreBreakdown: b.scoreBreakdown,
        reason: b.reason,
        addedAt: b.addedAt,
      })),
    });
  } catch (err) {
    console.error("[Backlog API] Error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve backlog" },
      { status: 500 }
    );
  }
}
