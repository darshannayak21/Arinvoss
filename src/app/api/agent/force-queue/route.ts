import { NextRequest, NextResponse } from "next/server";
import { runWriter } from "@/lib/agents/writer";
import {
  createPost,
  getRecentPostDigest,
  getActiveAgentId,
  markSourceSeen,
} from "@/lib/store";
import { savePostToSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { title, url, reason } = await request.json();
    if (!title || !url) {
      return NextResponse.json({ error: "Missing title or url" }, { status: 400 });
    }

    const agentId = getActiveAgentId();
    if (!agentId) {
      return NextResponse.json({ error: "No active agent" }, { status: 400 });
    }

    // Since we are forcing it, we just create a dummy SourceItem
    const dummyItem = {
      title: title,
      url: url,
      summary: `User manually forced curation of: ${title}`,
      sourceName: "Manual User Override",
    };

    const recentDigest = getRecentPostDigest(agentId);
    
    // Send it directly to the Writer, bypassing Scout
    const writerResult = await runWriter(
      dummyItem,
      reason || "Manually prioritized by User override",
      recentDigest
    );

    // Save it as a queued post
    const postId = createPost({
      agentId,
      text: writerResult.text,
      rationale: writerResult.rationale,
      whyTopicSelected: writerResult.whyTopicSelected,
      whyRelevantNow: writerResult.whyRelevantNow,
      sources: writerResult.sources,
      topicTags: writerResult.topicTags,
      editorialScore: 100, // Forced score
      mermaidDiagram: writerResult.mermaidDiagram,
      metricsCited: writerResult.metricsCited,
    });

    markSourceSeen(url, "published");

    // Save to Supabase so it shows up in Approved Feed
    await savePostToSupabase({
      id: postId,
      agentId,
      text: writerResult.text,
      rationale: writerResult.rationale,
      whyTopicSelected: writerResult.whyTopicSelected,
      whyRelevantNow: writerResult.whyRelevantNow,
      sources: writerResult.sources,
      topicTags: writerResult.topicTags,
      editorialScore: 100,
      mermaidDiagram: writerResult.mermaidDiagram,
      metricsCited: writerResult.metricsCited,
    }).catch((e) => console.error("Supabase save error on forced post:", e));

    return NextResponse.json({ success: true, postId });
  } catch (err) {
    console.error("[Force Queue] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
