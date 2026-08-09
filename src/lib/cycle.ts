import {
  fetchArxiv,
  fetchHackerNews,
  fetchReddit,
  fetchRssFeeds,
  fetchGitHub,
  getResearchContinuityCandidates,
  SourceItem,
} from "./sources";
import { runScout, ScoutResult } from "./agents/scout";
import { runWriter } from "./agents/writer";
import {
  isSourceSeen,
  isSourceEligibleForReview,
  isSourceInBacklog,
  markSourceSeen,
  createRejectedTopic,
  createPost,
  getRecentPostDigest,
  getActiveAgentId,
  addToBacklog,
  getBacklog,
  popBestBacklogItem,
  BacklogItem,
} from "./store";
import { dispatchToMakeWebhook } from "./publishWebhook";
import { savePostToSupabase, updatePostLinkedInStatus } from "./supabase";

interface CycleResult {
  published: boolean;
  postId?: string;
  sourceType?: "live" | "backlog";
  candidateScore?: number;
  candidatesEvaluated: number;
  rejected: number;
  backlogQueued: number;
  backlogRemaining: number;
  error?: string;
  discoveryStatus?: string;
}

/**
 * Run one full Scout → Queue/Backlog → Writer cycle:
 * 1. Fetch from all sources in parallel
 * 2. Filter out already-seen / already-queued items
 * 3. Scout evaluates each new item against the 4-pillar 100-point rubric
 * 4. High-signal items (score >= 75) are approved; below 75 are logged as rejected
 * 5. Dynamic Queue Arbitrator: Compares best live candidate vs best backlog candidate
 * 6. Winner is written and published; runners-up (score >= 75) are stored in backlog.json
 */
export async function runCycle(): Promise<CycleResult> {
  const agentId = getActiveAgentId();
  if (!agentId) {
    return {
      published: false,
      candidatesEvaluated: 0,
      rejected: 0,
      backlogQueued: 0,
      backlogRemaining: 0,
      error: "No active agent. Call POST /api/agent/init first.",
    };
  }

  console.log("\n=======================================================");
  console.log(`[Cycle] Starting autonomous cycle for agent: ${agentId}`);
  console.log("=======================================================");

  // ── Step 1: Fetch from all sources in parallel ──
  console.log("[Cycle] Polling live sources...");
  const results = await Promise.allSettled([
    fetchArxiv(),
    fetchHackerNews(),
    fetchReddit(),
    fetchRssFeeds(),
    fetchGitHub(),
  ]);

  const sourceNames = ["arXiv", "HackerNews", "Reddit", "RSS", "GitHub"];
  const allItems: SourceItem[] = [];

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      console.log(`  [${sourceNames[i]}] → ${r.value.length} items`);
      allItems.push(...r.value);
    } else {
      console.warn(`  [${sourceNames[i]}] → FAILED: ${r.reason}`);
    }
  });

  const liveItemCount = allItems.length;
  console.log(`[Cycle] Total live items retrieved: ${liveItemCount}`);

  // ── Step 2: Deduplicate against seen sources & backlog ──
  const newItems: SourceItem[] = [];
  const addEligible = (items: SourceItem[]) => {
    for (const item of items) {
      if (!item.url || isSourceSeen(item.url) || isSourceInBacklog(agentId, item.url)) continue;
      if (!isSourceEligibleForReview(item.url)) continue;
      if (!newItems.some((existing) => existing.url === item.url)) newItems.push(item);
    }
  };
  addEligible(allItems);

  let discoveryStatus = "Live sources returned fresh research candidates.";
  if (newItems.length === 0) {
    console.log("[Cycle] Default discovery exhausted; expanding arXiv and GitHub queries.");
    const expandedResults = await Promise.allSettled([
      fetchArxiv("expanded"),
      fetchGitHub("expanded"),
    ]);
    const expandedItems = expandedResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );
    addEligible(expandedItems);
    if (newItems.length > 0) {
      discoveryStatus = "Default feeds had no unseen candidates; expanded live research search supplied additional material.";
    }
  }

  if (newItems.length === 0) {
    const continuityItems = getResearchContinuityCandidates().filter(
      (item) => !isSourceSeen(item.url) && !isSourceInBacklog(agentId, item.url) && isSourceEligibleForReview(item.url)
    );
    newItems.push(...continuityItems);
    discoveryStatus = continuityItems.length > 0
      ? "Live search had no unseen candidates; the research continuity queue supplied primary-source deep dives."
      : liveItemCount === 0
        ? "Live sources were unavailable and the continuity queue is exhausted."
        : "All currently discovered items were already evaluated; awaiting new live research."
  }

  console.log(`[Cycle] Fresh unseen items for evaluation: ${newItems.length}. ${discoveryStatus}`);

  // ── Step 3: Scout evaluates fresh items with the 100-Point Rubric (Threshold >= 75) ──
  let rejectedCount = 0;
  let evaluatedCount = 0;
  const approvedLiveCandidates: { item: SourceItem; result: ScoutResult }[] = [];
  const allEvaluatedCandidates: { item: SourceItem; result: ScoutResult }[] = [];

  // Evaluate up to 5 new items per cycle to conserve rate limits
  const toEvaluate = newItems.slice(0, 5);

  for (const item of toEvaluate) {
    try {
      evaluatedCount++;
      const result = await runScout(item);

      const status = result.worth_publishing ? "✓ PASS" : "✗ REJECT";
      console.log(
        `  [Scout] ${status} (${result.score}/100) "${item.title.substring(0, 65)}..."`
      );
      console.log(
        `          [Breakdown: AI=${result.breakdown.ai_relevance}/25, Novelty=${result.breakdown.technical_novelty}/25, Scroll=${result.breakdown.scroll_stopping}/30, Cred=${result.breakdown.source_credibility}/20]`
      );

      allEvaluatedCandidates.push({ item, result });

      // We will sort and filter them after all are evaluated
      // to ensure we always have at least one fallback.

      // Safe delay between Scout LLM calls
      await new Promise((r) => setTimeout(r, 1200));
    } catch (err) {
      console.error(`  [Scout] Error on "${item.title}":`, err);
    }
  }

  // ── Step 4: Content Backlog & Queue Arbitration ──
  
  // Sort ALL evaluated candidates by score descending
  allEvaluatedCandidates.sort((a, b) => b.result.score - a.result.score);
  
  // If nothing scored >= 75, we guarantee a post by taking the best one anyway!
  if (allEvaluatedCandidates.length > 0 && approvedLiveCandidates.length === 0) {
    const bestFallback = allEvaluatedCandidates[0];
    console.log(`  [Fallback] No items reached 75. Guaranteeing post by promoting highest scored item: ${bestFallback.result.score}/100`);
    approvedLiveCandidates.push(bestFallback);
    
    // Mark the rest as rejected
    for (let i = 1; i < allEvaluatedCandidates.length; i++) {
      const rejected = allEvaluatedCandidates[i];
      markSourceSeen(rejected.item.url, "rejected");
      createRejectedTopic(agentId, rejected.item.title, rejected.result.reason, rejected.item.url);
      rejectedCount++;
    }
  } else {
    // We have items >= 75, separate them properly
    for (const evaluated of allEvaluatedCandidates) {
      if (evaluated.result.worth_publishing && evaluated.result.score >= 75) {
        approvedLiveCandidates.push(evaluated);
      } else {
        markSourceSeen(evaluated.item.url, "rejected");
        createRejectedTopic(agentId, evaluated.item.title, evaluated.result.reason, evaluated.item.url);
        rejectedCount++;
      }
    }
  }

  // Sort approved candidates by score descending
  approvedLiveCandidates.sort((a, b) => b.result.score - a.result.score);

  let candidateToPublish: {
    item: SourceItem;
    score: number;
    reason: string;
    sourceType: "live" | "backlog";
  } | null = null;

  let queuedToBacklogCount = 0;

  const currentBacklog = getBacklog(agentId);
  const topBacklogItem: BacklogItem | null = currentBacklog.length > 0 ? currentBacklog[0] : null;

  if (approvedLiveCandidates.length > 0) {
    const topLive = approvedLiveCandidates[0];
    const liveRunnersUp = approvedLiveCandidates.slice(1);

    // Save all runners-up to backlog instead of wasting them!
    for (const runnerUp of liveRunnersUp) {
      addToBacklog(
        agentId,
        runnerUp.item,
        runnerUp.result.score,
        runnerUp.result.breakdown,
        runnerUp.result.reason
      );
      queuedToBacklogCount++;
      console.log(
        `  [Backlog] Enqueued runner-up: "${runnerUp.item.title.substring(0, 60)}" (Score ${runnerUp.result.score})`
      );
    }

    // Compare top live candidate vs top backlog candidate
    if (topBacklogItem && topBacklogItem.score > topLive.result.score) {
      console.log(
        `  [Queue] Top backlog item (${topBacklogItem.score}) beats top live item (${topLive.result.score}). Publishing from backlog.`
      );
      // Enqueue top live item into backlog
      addToBacklog(
        agentId,
        topLive.item,
        topLive.result.score,
        topLive.result.breakdown,
        topLive.result.reason
      );
      queuedToBacklogCount++;

      // Pop best from backlog
      const popped = popBestBacklogItem(agentId);
      if (popped) {
        candidateToPublish = {
          item: popped.item,
          score: popped.score,
          reason: popped.reason,
          sourceType: "backlog",
        };
      }
    } else {
      console.log(
        `  [Queue] Top live item (${topLive.result.score}) selected for immediate publication.`
      );
      candidateToPublish = {
        item: topLive.item,
        score: topLive.result.score,
        reason: topLive.result.reason,
        sourceType: "live",
      };
    }
  } else {
    // No live candidate scored >= 75 this cycle. Check if backlog has high-signal content ready!
    if (topBacklogItem && topBacklogItem.score >= 75) {
      console.log(
        `  [Queue] Live feed quiet. Popping top backlog item (${topBacklogItem.score}/100) for publishing.`
      );
      const popped = popBestBacklogItem(agentId);
      if (popped) {
        candidateToPublish = {
          item: popped.item,
          score: popped.score,
          reason: popped.reason,
          sourceType: "backlog",
        };
      }
    }
  }

  const remainingBacklogCount = getBacklog(agentId).length;

  // ── Step 5: Writer produces post for the chosen candidate ──
  if (!candidateToPublish) {
    console.log(
      `[Cycle] No candidate met the >= 75 threshold and backlog is empty. Cycle completed calmly.`
    );
    return {
      published: false,
      candidatesEvaluated: evaluatedCount,
      rejected: rejectedCount,
      backlogQueued: queuedToBacklogCount,
      backlogRemaining: remainingBacklogCount,
      discoveryStatus,
    };
  }

  console.log(
    `\n[Writer] Generating post for: "${candidateToPublish.item.title}" (Score=${candidateToPublish.score}, Source=${candidateToPublish.sourceType})`
  );

  try {
    const recentDigest = getRecentPostDigest(agentId);
    const writerResult = await runWriter(
      candidateToPublish.item,
      candidateToPublish.reason,
      recentDigest
    );

    const postId = createPost({
      agentId,
      text: writerResult.text,
      rationale: writerResult.rationale,
      whyTopicSelected: writerResult.whyTopicSelected,
      whyRelevantNow: writerResult.whyRelevantNow,
      sources: writerResult.sources,
      topicTags: writerResult.topicTags,
      editorialScore: candidateToPublish.score,
      mermaidDiagram: writerResult.mermaidDiagram,
      metricsCited: writerResult.metricsCited,
    });

    markSourceSeen(candidateToPublish.item.url, "published");

    // 1. Persist to Supabase Database (if configured)
    void savePostToSupabase({
      id: postId,
      agentId,
      text: writerResult.text,
      rationale: writerResult.rationale,
      whyTopicSelected: writerResult.whyTopicSelected,
      whyRelevantNow: writerResult.whyRelevantNow,
      sources: writerResult.sources,
      topicTags: writerResult.topicTags,
      editorialScore: candidateToPublish.score,
      mermaidDiagram: writerResult.mermaidDiagram,
      metricsCited: writerResult.metricsCited,
    }).catch((e) => console.error("[Cycle] Supabase save error:", e));

    // 2. Posts are now ONLY queued by the cycle.
    // They will be picked up by the dispatcher cron job or published manually via the UI.
    console.log(`[Cycle] ✓ Successfully queued post ${postId}`);
    console.log(`        Hook: "${writerResult.text.split("\n")[0]}"\n`);

    return {
      published: true,
      postId,
      sourceType: candidateToPublish.sourceType,
      candidateScore: candidateToPublish.score,
      candidatesEvaluated: evaluatedCount,
      rejected: rejectedCount,
      backlogQueued: queuedToBacklogCount,
      backlogRemaining: remainingBacklogCount,
      discoveryStatus,
    };
  } catch (err) {
    console.error("[Writer] Failed:", err);
    markSourceSeen(candidateToPublish.item.url, "rejected");
    return {
      published: false,
      candidatesEvaluated: evaluatedCount,
      rejected: rejectedCount,
      backlogQueued: queuedToBacklogCount,
      backlogRemaining: remainingBacklogCount,
      error: `Writer failed: ${err instanceof Error ? err.message : String(err)}`,
      discoveryStatus,
    };
  }
}
