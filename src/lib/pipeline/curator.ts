import {
  fetchArxiv,
  fetchHackerNews,
  fetchReddit,
  fetchRssFeeds,
  fetchGitHub,
  getResearchContinuityCandidates,
  SourceItem,
} from "../sources";
import { runScout, ScoutResult } from "../agents/scout";
import { runWriter } from "../agents/writer";
import {
  isSourceSeen,
  isSourceEligibleForReview,
  markSourceSeen,
  createRejectedTopic,
  getActiveAgentId,
  getRecentPostDigest,
} from "../store";
import { savePostToSupabase } from "../supabase";

export interface CurationResult {
  success: boolean;
  queuedCount: number;
  queuedPostIds: string[];
  candidatesEvaluated: number;
  rejectedCount: number;
  error?: string;
}

/**
 * CURATION CRON ENGINE (Runs at 8:00 AM UTC)
 * 1. Scrapes HuggingFace, arXiv, GitHub, Reddit, RSS
 * 2. Evaluates & scores candidates with Scout (100-point rubric)
 * 3. Selects ONLY the TOP 2 ideas per day
 * 4. Generates copy, architecture diagrams, 6 hashtags, and saves to Supabase as 'QUEUED'
 */
export async function runCurationCycle(): Promise<CurationResult> {
  const agentId = getActiveAgentId() || "agent-aris-voss";

  console.log("\n=======================================================");
  console.log(`[Curation Engine] Starting Autonomous Daily Curation for: ${agentId}`);
  console.log("=======================================================");

  // 1. Fetch from all sources in parallel
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
    }
  });

  // 2. Filter out already-seen items
  const newItems: SourceItem[] = [];
  for (const item of allItems) {
    if (!item.url || isSourceSeen(item.url)) continue;
    if (!isSourceEligibleForReview(item.url)) continue;
    if (!newItems.some((e) => e.url === item.url)) newItems.push(item);
  }

  // If live feeds dry, fall back to continuity pool
  if (newItems.length === 0) {
    const continuityItems = getResearchContinuityCandidates().filter(
      (item) => !isSourceSeen(item.url) && isSourceEligibleForReview(item.url)
    );
    newItems.push(...continuityItems);
  }

  console.log(`[Curation Engine] Candidate items for evaluation: ${newItems.length}`);

  // 3. Evaluate candidates with Scout
  let evaluatedCount = 0;
  let rejectedCount = 0;
  const allCandidates: { item: SourceItem; result: ScoutResult }[] = [];

  // Evaluate up to 8 candidates to find the best 2
  const toEvaluate = newItems.slice(0, 8);

  for (const item of toEvaluate) {
    try {
      evaluatedCount++;
      const result = await runScout(item);
      allCandidates.push({ item, result });

      if (result.worth_publishing && result.score >= 75) {
        console.log(`  [Scout] ✓ APPROVED (${result.score}/100) "${item.title.substring(0, 55)}..."`);
      } else {
        console.log(`  [Scout] ✗ REJECTED (${result.score}/100) "${item.title.substring(0, 55)}..."`);
      }

      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  [Scout] Error evaluating ${item.title}:`, err);
    }
  }

  // 4. Combine fresh candidates with Backlog items to find absolute best
  const currentBacklog = getBacklog(agentId);
  const candidatesPool = [
    ...allCandidates.map(c => ({
      item: c.item,
      result: c.result,
      sourceType: "live" as const
    })),
    ...currentBacklog.map(b => ({
      item: b.item,
      result: {
        worth_publishing: b.score >= 75,
        score: b.score,
        breakdown: b.scoreBreakdown,
        reason: b.reason
      },
      sourceType: "backlog" as const
    }))
  ];

  // Sort and select ONLY TOP 2 ideas per day (guaranteed from best available)
  candidatesPool.sort((a, b) => b.result.score - a.result.score);
  const top2 = candidatesPool.slice(0, 2);
  
  // Mark the others as rejected or backlog
  const selectedUrls = top2.map(c => c.item.url);
  
  // Re-process live candidates: if not selected, add to backlog if >= 75, else reject
  for (const candidate of allCandidates) {
    if (!selectedUrls.includes(candidate.item.url)) {
       if (candidate.result.score >= 75) {
         addToBacklog(agentId, candidate.item, candidate.result.score, candidate.result.breakdown, candidate.result.reason);
       } else {
         markSourceSeen(candidate.item.url, "rejected");
         createRejectedTopic(agentId, candidate.item.title, candidate.result.reason, candidate.item.url);
         rejectedCount++;
       }
    }
  }

  // Clean up backlog: pop selected ones
  for (const selected of top2) {
    if (selected.sourceType === "backlog") {
      popBestBacklogItem(agentId);
    }
  }

  if (top2.length === 0) {
    console.log("[Curation Engine] No candidates met the >= 75 threshold today.");
    return {
      success: true,
      queuedCount: 0,
      queuedPostIds: [],
      candidatesEvaluated: evaluatedCount,
      rejectedCount,
    };
  }

  console.log(`[Curation Engine] Shortlisted top ${top2.length} ideas. Generating post copy and architecture diagrams...`);

  const queuedPostIds: string[] = [];
  const recentDigest = getRecentPostDigest(agentId);

  for (const candidate of top2) {
    try {
      const writerResult = await runWriter(candidate.item, candidate.result.reason, recentDigest);
      const postId = `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      markSourceSeen(candidate.item.url, "published");

      // Save to Supabase as 'QUEUED'
      await savePostToSupabase({
        id: postId,
        agentId,
        status: "QUEUED",
        text: writerResult.text,
        rationale: writerResult.rationale,
        whyTopicSelected: writerResult.whyTopicSelected,
        whyRelevantNow: writerResult.whyRelevantNow,
        sources: writerResult.sources,
        topicTags: writerResult.topicTags,
        editorialScore: candidate.result.score,
        mermaidDiagram: writerResult.mermaidDiagram,
        metricsCited: writerResult.metricsCited,
        publishedToLinkedin: false,
      });

      queuedPostIds.push(postId);
      console.log(`  [Curation Engine] ✓ Enqueued Post [${postId}] as 'QUEUED' in Supabase.`);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      console.error(`  [Curation Engine] Failed to generate post for ${candidate.item.title}:`, err);
    }
  }

  return {
    success: true,
    queuedCount: queuedPostIds.length,
    queuedPostIds,
    candidatesEvaluated: evaluatedCount,
    rejectedCount,
  };
}
