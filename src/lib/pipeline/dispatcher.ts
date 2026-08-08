import {
  getOldestQueuedPost,
  getTodayPublishedCount,
  updatePostLinkedInStatus,
  SupabasePostRecord,
} from "../supabase";
import { dispatchToMakeWebhook, mermaidToPngUrl } from "../publishWebhook";
import { runCurationCycle } from "./curator";

export interface DispatchResult {
  published: boolean;
  postId?: string;
  hook?: string;
  imageUrl?: string;
  reason?: string;
  publishedTodayCount: number;
  error?: string;
}

/**
 * DISPATCH CRON ENGINE (Runs at 11:00 AM & 6:00 PM UTC)
 * 1. Checks that no more than 2 posts are published per day
 * 2. Pops the oldest 'QUEUED' post from Supabase
 * 3. Validates public diagram PNG URL
 * 4. Dispatches { text, imageUrl, supabase_id } payload to Make.com Webhook
 * 5. Updates Supabase record to 'PUBLISHED'
 */
export async function runDispatchCycle(): Promise<DispatchResult> {
  console.log("\n=======================================================");
  console.log("[Dispatch Engine] Starting Autonomous LinkedIn Dispatch");
  console.log("=======================================================");

  // 1. Enforce max 2 posts per day limit
  const publishedToday = await getTodayPublishedCount();
  if (publishedToday >= 2) {
    console.log(`[Dispatch Engine] Daily publication limit reached (${publishedToday}/2 published today). Halting dispatch.`);
    return {
      published: false,
      reason: `Daily limit of 2 posts reached (${publishedToday} published today).`,
      publishedTodayCount: publishedToday,
    };
  }

  // 2. Fetch oldest QUEUED post from Supabase
  let queuedPost: SupabasePostRecord | null = await getOldestQueuedPost();

  // If no queued post exists, trigger a curation cycle to queue fresh material
  if (!queuedPost) {
    console.log("[Dispatch Engine] Queue is empty. Triggering automated curation cycle...");
    const curation = await runCurationCycle();
    if (curation.queuedCount > 0) {
      queuedPost = await getOldestQueuedPost();
    }
  }

  if (!queuedPost) {
    console.log("[Dispatch Engine] No queued post available for dispatch.");
    return {
      published: false,
      reason: "No queued post available.",
      publishedTodayCount: publishedToday,
    };
  }

  console.log(`[Dispatch Engine] Popped QUEUED post [${queuedPost.id}]`);
  console.log(`                 Hook: "${queuedPost.text.split("\n")[0]}"`);

  // 3. Ensure valid, non-hallucinated image URL (direct Kroki PNG or verified public URL)
  let directImageUrl = queuedPost.image_url;
  if (!directImageUrl || !directImageUrl.startsWith("http")) {
    if (queuedPost.mermaid_diagram && queuedPost.mermaid_diagram.length > 10) {
      directImageUrl = mermaidToPngUrl(queuedPost.mermaid_diagram);
    } else {
      directImageUrl = "";
    }
  }

  // 4. Dispatch to Make.com Webhook with exact required payload
  console.log(`[Dispatch Engine] Sending payload to Make.com webhook with supabase_id: ${queuedPost.id}...`);
  const webhookRes = await dispatchToMakeWebhook({
    id: queuedPost.id,
    supabaseId: queuedPost.id,
    text: queuedPost.text,
    imageUrl: directImageUrl,
    mermaidDiagram: queuedPost.mermaid_diagram,
  });

  if (!webhookRes.success) {
    console.error(`[Dispatch Engine] Webhook dispatch failed for ${queuedPost.id}:`, webhookRes.error);
    return {
      published: false,
      postId: queuedPost.id,
      error: webhookRes.error || "Webhook request failed",
      publishedTodayCount: publishedToday,
    };
  }

  // 5. Update status to 'PUBLISHED' in Supabase
  await updatePostLinkedInStatus(queuedPost.id, true, webhookRes.responseText);

  console.log(`[Dispatch Engine] ✓ Successfully published post [${queuedPost.id}] to LinkedIn! Status: PUBLISHED`);

  return {
    published: true,
    postId: queuedPost.id,
    hook: queuedPost.text.split("\n")[0],
    imageUrl: directImageUrl,
    publishedTodayCount: publishedToday + 1,
  };
}
