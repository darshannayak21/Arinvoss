import { NextRequest, NextResponse } from "next/server";
import { getRejectedTopics, getAgent } from "@/lib/store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json(
        { error: "Missing agentId query parameter" },
        { status: 400 }
      );
    }

    const agent = getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const rejected = getRejectedTopics(agentId);

    return NextResponse.json({
      rejected: rejected.map((r) => ({
        title: r.title,
        reason: r.reason,
        sourceUrl: r.sourceUrl,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("[Rejected] Error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve rejected topics" },
      { status: 500 }
    );
  }
}
