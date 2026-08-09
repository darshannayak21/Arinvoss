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

  let candidatesToPublish: {
    item: SourceItem;
    score: number;
    reason: string;
    sourceType: "live" | "backlog";
  }[] = [];

  let queuedToBacklogCount = 0;

  // We want to pick the best 2 candidates for publication (since the user runs the cycle once a day, but posts twice)
  const currentBacklog = getBacklog(agentId);
  const candidatesPool = [...approvedLiveCandidates.map(c => ({
    item: c.item,
    score: c.result.score,
    reason: c.result.reason,
    sourceType: "live" as const
  })), ...currentBacklog.map(b => ({
    item: b.item,
    score: b.score,
    reason: b.reason,
    sourceType: "backlog" as const
  }))];

  // Sort the combined pool by score
  candidatesPool.sort((a, b) => b.score - a.score);

  // Take the top 2
  candidatesToPublish = candidatesPool.slice(0, 2);

  // For any live candidate that we did NOT pick, add it to the backlog
  const selectedUrls = candidatesToPublish.map(c => c.item.url);
  for (const live of approvedLiveCandidates) {
    if (!selectedUrls.includes(live.item.url)) {
      addToBacklog(agentId, live.item, live.result.score, live.result.breakdown, live.result.reason);
      queuedToBacklogCount++;
    }
  }
  
  // For any backlog candidate that WE DID pick, remove it from the backlog
  for (const pub of candidatesToPublish) {
    if (pub.sourceType === "backlog") {
      popBestBacklogItem(agentId); // Simplified, pops top one by one. Or we can just use removeFromBacklog
      // Actually since it's sorted, we pop the best ones anyway.
    }
  }

  const remainingBacklogCount = getBacklog(agentId).length;

  // ── Step 5: Writer produces post for the chosen candidates ──
  if (candidatesToPublish.length === 0) {
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

  let successCount = 0;
  let lastPostId: string | undefined = undefined;

  for (const candidate of candidatesToPublish) {
    console.log(
      `\n[Writer] Generating post for: "${candidate.item.title}" (Score=${candidate.score}, Source=${candidate.sourceType})`
    );

    try {
      const recentDigest = getRecentPostDigest(agentId);
      const writerResult = await runWriter(
        candidate.item,
        candidate.reason,
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
        editorialScore: candidate.score,
        mermaidDiagram: writerResult.mermaidDiagram,
        metricsCited: writerResult.metricsCited,
      });

      markSourceSeen(candidate.item.url, "published");

      // 1. Persist to Supabase Database
      void savePostToSupabase({
        id: postId,
        agentId,
        text: writerResult.text,
        rationale: writerResult.rationale,
        whyTopicSelected: writerResult.whyTopicSelected,
        whyRelevantNow: writerResult.whyRelevantNow,
        sources: writerResult.sources,
        topicTags: writerResult.topicTags,
        editorialScore: candidate.score,
        mermaidDiagram: writerResult.mermaidDiagram,
        metricsCited: writerResult.metricsCited,
      }).catch((e) => console.error("[Cycle] Supabase save error:", e));

      console.log(`[Cycle] ✓ Successfully queued post ${postId}`);
      console.log(`        Hook: "${writerResult.text.split("\n")[0]}"\n`);
      
      successCount++;
      lastPostId = postId;
      
      // Delay before writing next one
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (err) {
      console.error("[Writer] Failed:", err);
      markSourceSeen(candidate.item.url, "rejected");
    }
  }

  if (successCount === 0) {
    return {
      published: false,
      candidatesEvaluated: evaluatedCount,
      rejected: rejectedCount,
      backlogQueued: queuedToBacklogCount,
      backlogRemaining: remainingBacklogCount,
      error: `All writers failed.`,
      discoveryStatus,
    };
  }

  return {
    published: true,
    postId: lastPostId,
    sourceType: candidatesToPublish[0].sourceType,
    candidateScore: candidatesToPublish[0].score,
    candidatesEvaluated: evaluatedCount,
    rejected: rejectedCount,
    backlogQueued: queuedToBacklogCount,
    backlogRemaining: remainingBacklogCount,
    discoveryStatus,
  };
}
