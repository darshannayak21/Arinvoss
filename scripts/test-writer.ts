import { runWriter } from "../src/lib/agents/writer";

async function main() {
  const testCandidate = {
    title: "FlashAttention-4: Asynchronous Kernel Pipeline for Million-Token Contexts",
    summary: "FlashAttention-4 introduces hardware-level warp specialization and async shared memory copying to achieve 3.2x throughput speedups on NVIDIA Blackwell GPUs for 1M+ token contexts.",
    url: "https://github.com/Dao-AILab/flash-attention",
    sourceName: "GitHub AI Trending",
    publishedAt: new Date().toISOString(),
  };

  console.log("Testing Writer LLM with new visual formatting prompt...\n");
  const res = await runWriter(testCandidate, "High architectural novelty and concrete speedup", []);

  console.log("==================== GENERATED POST TEXT ====================");
  console.log(res.text);
  console.log("\n==================== EDITORIAL RATIONALE ====================");
  console.log(res.rationale);
  console.log("=============================================================");
}

main().catch(console.error);
