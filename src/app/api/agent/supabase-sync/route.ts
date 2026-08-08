import { NextResponse } from "next/server";
import { getPosts, getActiveAgentId } from "@/lib/store";
import { isSupabaseConfigured, savePostToSupabase } from "@/lib/supabase";

export async function POST() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            "Supabase credentials missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) to .env.local",
        },
        { status: 400 }
      );
    }

    const agentId = getActiveAgentId();
    if (!agentId) {
      return NextResponse.json({ error: "No active agent found" }, { status: 404 });
    }

    const posts = getPosts(agentId);
    const results = [];

    for (const post of posts) {
      const res = await savePostToSupabase({
        id: post.id,
        agentId: post.agentId || agentId,
        text: post.text,
        rationale: post.rationale,
        whyTopicSelected: post.whyTopicSelected,
        whyRelevantNow: post.whyRelevantNow,
        sources: post.sources,
        topicTags: post.topicTags,
        editorialScore: post.editorialScore ?? 85,
        mermaidDiagram: post.mermaidDiagram || "",
        metricsCited: post.metricsCited || [],
      });
      results.push({ id: post.id, status: res.success ? "synced" : "failed", error: res.error });
    }

    return NextResponse.json({
      message: `Synced ${results.filter((r) => r.status === "synced").length}/${posts.length} posts to Supabase.`,
      results,
    });
  } catch (err) {
    console.error("[Supabase Sync] Error:", err);
    return NextResponse.json(
      { error: "Failed to sync posts to Supabase" },
      { status: 500 }
    );
  }
}
