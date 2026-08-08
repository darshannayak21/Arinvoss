import { fetchArxiv, fetchGitHub } from "../src/lib/sources/index.ts";

async function main() {
  console.log("Fetching arXiv...");
  const arxiv = await fetchArxiv();
  console.log(`arXiv returned ${arxiv.length} items`);
  if (arxiv.length > 0) {
    console.log("Sample arXiv:", arxiv[0].title);
  }

  console.log("\nFetching GitHub...");
  const gh = await fetchGitHub();
  console.log(`GitHub returned ${gh.length} items`);
  if (gh.length > 0) {
    console.log("Sample GitHub:", gh[0].title);
    console.log("README snippet preview:", gh[0].readmeSnippet?.substring(0, 100));
  }
}

main().catch(console.error);
