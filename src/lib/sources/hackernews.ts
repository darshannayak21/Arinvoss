import { SourceItem } from "./types";

interface HNHit {
  title: string;
  url: string | null;
  story_text: string | null;
  objectID: string;
  created_at: string;
  points: number;
}

/**
 * Fetch recent AI-related stories from Hacker News via Algolia API.
 */
export async function fetchHackerNews(): Promise<SourceItem[]> {
  const url =
    "https://hn.algolia.com/api/v1/search_by_date?tags=story&query=AI+machine+learning+LLM&hitsPerPage=10";

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];

    const data = await res.json();
    const hits: HNHit[] = data.hits || [];

    return hits
      .filter((h) => h.url) // skip Ask HN, Show HN without URL
      .map((hit) => ({
        title: hit.title || "Untitled",
        summary: hit.story_text?.substring(0, 500) || hit.title || "",
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        sourceName: "Hacker News",
        publishedAt: hit.created_at || new Date().toISOString(),
      }));
  } catch (err) {
    console.error("[HN] fetch failed:", err);
    return [];
  }
}
