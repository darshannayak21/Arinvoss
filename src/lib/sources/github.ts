import { SourceItem } from "./types";

/**
 * Fetch raw README.md snippet (first 2,000 characters) from GitHub repository
 */
async function fetchRepoReadme(fullName: string): Promise<string | undefined> {
  const branches = ["main", "master"];
  for (const branch of branches) {
    try {
      const url = `https://raw.githubusercontent.com/${fullName}/${branch}/README.md`;
      const res = await fetch(url, {
        headers: { "User-Agent": "ArisVossBot/2.0" },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const text = await res.text();
        // Clean out images and long badges if any, return first 2000 chars
        return text.substring(0, 2000).trim();
      }
    } catch {
      // Continue to next branch candidate
    }
  }
  return undefined;
}

/**
 * Fetch trending AI/ML repositories from GitHub across key frontiers:
 * - Autonomous AI agents & tool-use
 * - Open-weight foundation models & vision-language
 * - High-throughput inference, quantization & serving (vLLM, GGUF, AWQ)
 * - Reasoning & Reinforcement Learning with Verifiable Rewards
 */
export async function fetchGitHub(mode: "default" | "expanded" = "default"): Promise<SourceItem[]> {
  const lookbackDays = mode === "expanded" ? 45 : 14;
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const queries = [
    `LLM agent autonomous created:>${since}`,
    `vLLM quantization inference acceleration created:>${since}`,
    `vision language model open source created:>${since}`,
    `reasoning reinforcement learning created:>${since}`,
    ...(mode === "expanded" ? [
      `inference optimization llm created:>${since}`,
      `quantization transformer serving created:>${since}`,
      `rag retrieval evaluation created:>${since}`,
    ] : []),
  ];

  const allItems: SourceItem[] = [];

  for (const q of queries) {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${mode === "expanded" ? 10 : 5}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "ArisVossBot/2.0",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) continue;
      const data = await res.json();

      for (const repo of data.items || []) {
        if (!repo.description || repo.stargazers_count < 5) continue;

        // Fetch deep README snippet (up to 2,000 chars)
        const readmeSnippet = await fetchRepoReadme(repo.full_name);

        allItems.push({
          title: `GitHub: ${repo.full_name}`,
          summary: [
            repo.description || "No description provided",
            `Primary Language: ${repo.language || "Python"}`,
            `Stars: ★${repo.stargazers_count}`,
            `Topics: ${(repo.topics || []).slice(0, 5).join(", ")}`,
            readmeSnippet ? `README Benchmark Excerpt: ${readmeSnippet.substring(0, 300)}...` : "",
            `Repository: ${repo.html_url}`,
          ].filter(Boolean).join(". "),
          url: repo.html_url,
          sourceName: "GitHub AI Trending",
          publishedAt: repo.created_at || new Date().toISOString(),
          readmeSnippet,
        });
      }
    } catch (err) {
      console.error("[GitHub] fetch failed:", err);
    }
  }

  return allItems;
}
