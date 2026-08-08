import { SourceItem } from "./types";

interface RedditChild {
  data: {
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    created_utc: number;
    score: number;
    subreddit: string;
  };
}

const SUBREDDITS = ["LocalLLaMA", "MachineLearning", "ArtificialIntelligence"];

/**
 * Fetch top and hot posts from core AI subreddits (r/LocalLLaMA, r/MachineLearning, r/ArtificialIntelligence).
 */
export async function fetchReddit(): Promise<SourceItem[]> {
  const allItems: SourceItem[] = [];

  for (const sub of SUBREDDITS) {
    const url = `https://www.reddit.com/r/${sub}/top.json?t=day&limit=6`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "ArisVossBot/2.0 (autonomous-ai-persona; educational-research)",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const children: RedditChild[] = data?.data?.children || [];

      for (const child of children) {
        const d = child.data;
        if (!d.title) continue;

        allItems.push({
          title: `[r/${sub}] ${d.title}`,
          summary: (d.selftext || d.title).substring(0, 600),
          url: d.url && d.url.startsWith("http") && !d.url.includes("reddit.com/gallery")
            ? d.url
            : `https://www.reddit.com${d.permalink}`,
          sourceName: `Reddit r/${sub}`,
          publishedAt: new Date(d.created_utc * 1000).toISOString(),
        });
      }
    } catch (err) {
      console.error(`[Reddit:r/${sub}] fetch failed:`, err);
    }
  }

  return allItems;
}
