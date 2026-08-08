import { NextRequest, NextResponse } from "next/server";
import { getPosts, getAgent, getActiveAgentId } from "@/lib/store";
import { isSupabaseConfigured, getPostsFromSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId") || getActiveAgentId();

    if (!agentId) {
      return NextResponse.json(
        { error: "Missing agentId query parameter" },
        { status: 400 }
      );
    }

    // 1. If Supabase is configured, fetch directly from Supabase
    if (isSupabaseConfigured()) {
      const supabasePosts = await getPostsFromSupabase(60);
      if (supabasePosts && supabasePosts.length > 0) {
        const formattedPosts = supabasePosts.map((post) => ({
          id: post.id,
          createdAt: post.created_at || new Date().toISOString(),
          text: post.text,
          rationale: post.rationale,
          whyTopicSelected: post.why_topic_selected ?? post.rationale,
          whyRelevantNow: post.why_relevant_now ?? post.rationale,
          publishingRationale: {
            whyTopicSelected: post.why_topic_selected ?? post.rationale,
            whyRelevantNow: post.why_relevant_now ?? post.rationale,
            sources: post.sources,
          },
          sources: post.sources,
          topicTags: post.topic_tags ?? [],
          editorialScore: post.editorial_score ?? 85,
          mermaidDiagram: post.mermaid_diagram,
          imageUrl: post.image_url,
          metricsCited: post.metrics_cited ?? [],
          publishedToLinkedin: post.published_to_linkedin,
        }));

        return NextResponse.json({ posts: formattedPosts });
      }
    }

    // 2. Fallback to local memory/store
    const posts = getPosts(agentId);

    const formattedPosts = posts.map((post) => ({
      id: post.id,
      createdAt: post.createdAt,
      text: post.text,
      rationale: post.rationale,
      whyTopicSelected: post.whyTopicSelected ?? post.rationale,
      whyRelevantNow: post.whyRelevantNow ?? post.rationale,
      publishingRationale: {
        whyTopicSelected: post.whyTopicSelected ?? post.rationale,
        whyRelevantNow: post.whyRelevantNow ?? post.rationale,
        sources: post.sources,
      },
      sources: post.sources,
      topicTags: post.topicTags ?? [],
      editorialScore: post.editorialScore ?? 85,
      mermaidDiagram: post.mermaidDiagram,
      metricsCited: post.metricsCited ?? [],
    }));

    return NextResponse.json({ posts: formattedPosts });
  } catch (err) {
    console.error("[Feed] Error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve feed" },
      { status: 500 }
    );
  }
}
