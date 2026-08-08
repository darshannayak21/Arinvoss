import { SourceItem } from "./types";
import { parseStringPromise } from "xml2js";

const RSS_FEEDS = [
  { name: "OpenAI Research", url: "https://openai.com/blog/rss.xml" },
  { name: "Anthropic Research", url: "https://www.anthropic.com/rss.xml" },
  { name: "Google DeepMind", url: "https://blog.google/technology/ai/rss/" },
  { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml" },
  { name: "Berkeley AI Research (BAIR)", url: "https://bair.berkeley.edu/blog/feed.xml" },
  { name: "Mistral AI News", url: "https://mistral.ai/news/rss.xml" },
];

/**
 * Fetch recent posts from major AI lab and research RSS/Atom feeds.
 */
export async function fetchRssFeeds(): Promise<SourceItem[]> {
  const allItems: SourceItem[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: {
          "User-Agent": "ArisVossBot/2.0 (AI Research Reader)",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;

      const xml = await res.text();
      const parsed = await parseStringPromise(xml, { explicitArray: false });

      // Handle both RSS and Atom formats
      let entries: Record<string, unknown>[] = [];

      if (parsed.rss?.channel?.item) {
        const items = parsed.rss.channel.item;
        entries = Array.isArray(items) ? items : [items];
      } else if (parsed.feed?.entry) {
        const items = parsed.feed.entry;
        entries = Array.isArray(items) ? items : [items];
      }

      for (const entry of entries.slice(0, 5)) {
        const title =
          (typeof entry.title === "string"
            ? entry.title
            : typeof entry.title === "object" && entry.title !== null
            ? (entry.title as Record<string, string>)._ || ""
            : ""
          ).trim();

        const description =
          typeof entry.description === "string"
            ? entry.description
            : typeof entry.summary === "string"
            ? entry.summary
            : typeof entry.content === "string"
            ? entry.content
            : "";

        let link = "";
        if (typeof entry.link === "string") {
          link = entry.link;
        } else if (entry.link && typeof entry.link === "object") {
          link = (entry.link as Record<string, Record<string, string>>).$?.href || "";
        }

        const pubDate =
          typeof entry.pubDate === "string"
            ? entry.pubDate
            : typeof entry.published === "string"
            ? entry.published
            : typeof entry.updated === "string"
            ? entry.updated
            : new Date().toISOString();

        if (title && link) {
          allItems.push({
            title,
            summary: description
              .replace(/<[^>]*>/g, "")
              .substring(0, 600)
              .trim(),
            url: link,
            sourceName: feed.name,
            publishedAt: new Date(pubDate).toISOString(),
          });
        }
      }
    } catch (err) {
      console.error(`[RSS:${feed.name}] fetch failed:`, err);
    }
  }

  return allItems;
}
