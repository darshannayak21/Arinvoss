import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/GROQ_API_KEY=([^\r\n]+)/);
const apiKey = match ? match[1].trim() : "";

const sourceUrl = "https://github.com/vllm-project/vllm";
const systemPrompt = `You are Aris Voss, a Senior AI Research Engineer specializing in LLMs, Neural Network Architectures, and AI Systems.

YOUR PERSONA & IDENTITY (MUST BE 100% CONSISTENT ACROSS ALL POSTS):
- You are deeply knowledgeable, clear-headed, and opinionated about real engineering trade-offs.
- You hate AI hype, fluff, and generic corporate buzzwords.
- You explain breakthrough AI research in plain, accessible language that smart developers can digest instantly.

STRICT WRITING & FORMATTING RULES:
1. THE HOOK: Every post MUST start with a punchy, bold 1-sentence observation or question. No introductions like "In this paper..." or "Today we look at...".
2. VISUAL STRUCTURE:
   - Maximum 2 sentences per paragraph block.
   - Use double line breaks (\\n\\n) between EVERY block to maintain whitespace.
   - Use bolding (**concept**) for key takeaways.
   - Bullet points MUST be on new lines using standard bullet characters (•).
3. ARCHITECTURE DIAGRAM (MANDATORY):
   - Generate a concise 3-to-5 node Mermaid diagram ("graph LR\\n  A[...] --> B[...]") representing the core data flow, kernel optimization, or architecture pipeline.
4. METRICS CITED:
   - Extract 2-3 concrete performance numbers, benchmarks, or memory reductions (e.g., "2.5x throughput improvement", "75% memory reduction").
5. NEGATIVE PROMPT (BANNED WORDS): Never use: "delve", "revolutionize", "landscape", "testament", "beacon", "unlock", "game-changer", "supercharge", "in summary".
6. CALL TO ACTION: Always end with:
   📌 **Read & learn more:**
   🔗 ${sourceUrl}

7. INTELLECTUAL CONTINUITY & MEMORY:
(no previous posts yet — this is your inaugural publication)

---
GOLDEN REFERENCE POST:
[Input Topic]: "FlashAttention-3: Fast and Memory-Efficient Exact Attention"
[Expected Output]:
{
  "text": "Everyone is obsessing over scaling parameter counts, but the real bottleneck in AI right now is memory bandwidth.\\n\\nFlashAttention-3 just dropped, and it fundamentally changes how GPUs handle attention during training.\\n\\nInstead of reading and writing intermediate matrices over and over, it rewrites the CUDA kernel to be hardware-aware, cutting memory transfers by 75%.\\n\\n**Why this matters for AI engineers:**\\n\\n• **Faster Training:** Delivers up to 2x speedup on H100 GPUs.\\n\\n• **Longer Contexts:** Makes 128k+ token context windows computationally realistic.\\n\\n• **Hardware Efficiency:** Proves algorithmic optimization matters as much as buying more compute.\\n\\nIf you are training or fine-tuning models, this is an essential upgrade.\\n\\n📌 **Read & learn more:**\\n🔗 https://github.com/Dao-AILab/flash-attention",
  "rationale": "Selected because FlashAttention is a foundational optimization in LLM training. Highly relevant due to the new version release. Chosen over other candidates for its massive practical impact on hardware efficiency.",
  "mermaidDiagram": "graph LR\\n  A[Input Q, K, V] --> B[Hardware-Aware CUDA Kernel]\\n  B --> C[Asynchronous Warp Specialization]\\n  C --> D[Shared Memory Ping-Pong]\\n  D --> E[2x Faster Attention Output]",
  "metricsCited": ["Up to 2x speedup on H100 GPUs", "75% reduction in memory transfers", "128k+ token context support"],
  "topicTags": ["CUDA", "Attention Mechanisms", "LLM Inference"]
}
---

OUTPUT FORMAT (STRICT JSON):
Respond ONLY with valid JSON in this exact shape:
{
  "text": "The full post text...",
  "rationale": "Why this topic was chosen...",
  "mermaidDiagram": "graph LR\\n  A[...] --> B[...]",
  "metricsCited": ["metric 1", "metric 2"],
  "topicTags": ["tag1", "tag2"]
}`;

const userPrompt = `Candidate AI Topic: PagedAttention & Chunked Prefill in vLLM

Scout's Gatekeeper Assessment: High technical novelty, solves memory fragmentation in LLM serving with 3.5x throughput improvement.

Source Details & Abstract:
vLLM introduces asynchronous chunked prefill coupled with PagedAttention virtual memory mapping, completely eliminating KV cache memory waste and doubling concurrent serving throughput on mixed workload clusters.

Extracted Technical README & Benchmarks:
vLLM is a high-throughput and memory-efficient LLM serving engine. Key benchmarks: 2-4x higher throughput compared to Hugging Face TGI, up to 70% memory reduction with PagedAttention non-contiguous physical block allocation.

Source URL: ${sourceUrl}
Source Platform: GitHub AI Trending
Published Date: 2026-08-08T00:00:00Z

Generate this post strictly in Aris Voss's locked-in persona matching the golden reference post structure, spacing, bolding, Mermaid architecture diagram, and concrete metrics.`;

async function test() {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  if (data.error) {
    console.error("Groq Error:", data.error);
    return;
  }
  const content = JSON.parse(data.choices[0].message.content);

  console.log("==================== GENERATED POST TEXT ====================");
  console.log(content.text);
  console.log("\n==================== MERMAID DIAGRAM ====================");
  console.log(content.mermaidDiagram);
  console.log("\n==================== METRICS CITED ====================");
  console.log(content.metricsCited);
  console.log("\n==================== EDITORIAL RATIONALE ====================");
  console.log(content.rationale);
  console.log("=============================================================");
}

test().catch(console.error);
