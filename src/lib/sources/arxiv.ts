import { SourceItem } from "./types";
import { parseStringPromise } from "xml2js";

/**
 * Fetch recent AI/ML papers from arXiv (cs.CL, cs.LG, cs.AI, cs.NE).
 * Uses the arXiv Atom API. Returns up to 12 recent papers.
 */
export async function fetchArxiv(mode: "default" | "expanded" = "default"): Promise<SourceItem[]> {
  const query = mode === "expanded"
    ? "cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR cat:cs.RO"
    : "cat:cs.CL OR cat:cs.LG OR cat:cs.AI OR cat:cs.NE";
  const maxResults = mode === "expanded" ? 60 : 20;
  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&sortBy=submittedDate&sortOrder=descending&max_results=${maxResults}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];

    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });

    const entries = parsed.feed?.entry;
    if (!entries) return [];

    const items = Array.isArray(entries) ? entries : [entries];

    return items.map((entry: Record<string, unknown>) => {
      const title = (typeof entry.title === "string" ? entry.title : "").replace(/\s+/g, " ").trim();
      const summary = (typeof entry.summary === "string" ? entry.summary : "").replace(/\s+/g, " ").trim().substring(0, 700);

      // Handle link — could be array or single object
      let arxivUrl = "";
      const links = entry.link;
      if (Array.isArray(links)) {
        const altLink = links.find(
          (l: Record<string, unknown>) =>
            (l as Record<string, Record<string, string>>).$?.type === "text/html" ||
            (l as Record<string, Record<string, string>>).$?.rel === "alternate"
        );
        arxivUrl = altLink
          ? (altLink as Record<string, Record<string, string>>).$?.href || ""
          : (links[0] as Record<string, Record<string, string>>)?.$?.href || "";
      } else if (links && typeof links === "object") {
        arxivUrl = (links as Record<string, Record<string, string>>).$?.href || "";
      }

      return {
        title,
        summary,
        url: arxivUrl,
        sourceName: "arXiv AI/ML",
        publishedAt: typeof entry.published === "string" ? entry.published : new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error("[arXiv] fetch failed:", err);
    return [];
  }
}
