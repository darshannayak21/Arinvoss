import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { mermaidToPngUrl } from "./publishWebhook";

let supabaseClient: SupabaseClient | null = null;

/**
 * Returns true if Supabase environment variables are configured.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && key && url.startsWith("http"));
}

/**
 * Get or initialize the Supabase client.
 */
export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });

  return supabaseClient;
}

export type PostStatus = "DRAFT" | "QUEUED" | "PUBLISHED";

export interface SupabasePostRecord {
  id: string;
  created_at?: string;
  agent_id: string;
  status?: PostStatus;
  text: string;
  rationale: string;
  why_topic_selected?: string;
  why_relevant_now?: string;
  sources: string[];
  topic_tags: string[];
  editorial_score: number;
  mermaid_diagram: string;
  image_url: string;
  metrics_cited: string[];
  published_to_linkedin?: boolean;
  linkedin_published_at?: string | null;
  webhook_response?: string | null;
}

/**
 * Persists a post to the Supabase `posts` table with State Machine support and graceful fallback.
 */
export async function savePostToSupabase(post: {
  id: string;
  agentId: string;
  status?: PostStatus;
  text: string;
  rationale: string;
  whyTopicSelected?: string;
  whyRelevantNow?: string;
  sources: string[];
  topicTags: string[];
  editorialScore: number;
  mermaidDiagram: string;
  imageUrl?: string;
  metricsCited: string[];
  publishedToLinkedin?: boolean;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      error: "Supabase is not configured.",
    };
  }

  try {
    const directImageUrl =
      post.imageUrl ||
      (post.mermaidDiagram ? mermaidToPngUrl(post.mermaidDiagram) : "");

    const baseRecord: any = {
      id: post.id,
      agent_id: post.agentId,
      text: post.text,
      rationale: post.rationale,
      why_topic_selected: post.whyTopicSelected || post.rationale,
      why_relevant_now: post.whyRelevantNow || post.rationale,
      sources: post.sources,
      topic_tags: post.topicTags,
      editorial_score: post.editorialScore,
      mermaid_diagram: post.mermaidDiagram,
      image_url: directImageUrl,
      metrics_cited: post.metricsCited,
      published_to_linkedin: post.publishedToLinkedin ?? false,
    };

    // First try with status column
    let { data, error } = await client
      .from("posts")
      .upsert({ ...baseRecord, status: post.status || "QUEUED" }, { onConflict: "id" })
      .select()
      .single();

    // If status column doesn't exist yet, retry without status column
    if (error && error.message && error.message.includes("status")) {
      const retry = await client
        .from("posts")
        .upsert(baseRecord, { onConflict: "id" })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("[Supabase] Insert error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Supabase] Successfully saved post ${post.id}`);
    return { success: true, data };
  } catch (err) {
    console.error("[Supabase] Exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Retrieves the oldest QUEUED / unpublished post for dispatching.
 */
export async function getOldestQueuedPost(): Promise<SupabasePostRecord | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    // 1. Try querying by status = 'QUEUED'
    let { data, error } = await client
      .from("posts")
      .select("*")
      .eq("status", "QUEUED")
      .order("created_at", { ascending: true })
      .limit(1);

    // 2. Fallback to published_to_linkedin = false if status column does not exist
    if (error && error.message && error.message.includes("status")) {
      const fallback = await client
        .from("posts")
        .select("*")
        .eq("published_to_linkedin", false)
        .order("created_at", { ascending: true })
        .limit(1);
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0] as SupabasePostRecord;
  } catch (err) {
    console.error("[Supabase] Error getting queued post:", err);
    return null;
  }
}

/**
 * Gets the number of posts published today in UTC (to enforce 2 posts/day limit).
 */
export async function getTodayPublishedCount(): Promise<number> {
  const client = getSupabase();
  if (!client) return 0;

  try {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { count, error } = await client
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("published_to_linkedin", true)
      .gte("created_at", startOfDay.toISOString());

    if (error) {
      console.error("[Supabase] Error getting today published count:", error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    return 0;
  }
}

/**
 * Updates post status in Supabase after successful webhook publication.
 */
export async function updatePostLinkedInStatus(
  postId: string,
  published: boolean,
  webhookResponse?: string
): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const updatePayload: any = {
      published_to_linkedin: published,
      linkedin_published_at: published ? new Date().toISOString() : null,
      webhook_response: webhookResponse || null,
    };

    // Try with status
    const { error } = await client
      .from("posts")
      .update({ ...updatePayload, status: published ? "PUBLISHED" : "QUEUED" })
      .eq("id", postId);

    if (error && error.message && error.message.includes("status")) {
      await client.from("posts").update(updatePayload).eq("id", postId);
    }
  } catch (err) {
    console.error("[Supabase] Failed to update LinkedIn status:", err);
  }
}

/**
 * Fetches the latest published posts from Supabase for UI and feeds.
 */
export async function getPostsFromSupabase(limit = 60): Promise<SupabasePostRecord[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[Supabase] Fetch error:", error);
      return [];
    }

    return data as SupabasePostRecord[];
  } catch (err) {
    console.error("[Supabase] Fetch exception:", err);
    return [];
  }
}
