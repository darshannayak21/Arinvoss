import { SourceItem } from "./types";

/**
 * A finite research-continuity queue used only when every live provider is
 * unavailable or has no unseen material. It keeps autonomous publishing alive
 * during transient network/rate-limit failures; each item still points to a
 * primary research source and is deduplicated by its canonical URL.
 */
export function getResearchContinuityCandidates(): SourceItem[] {
  return [
    {
      title: "FlashAttention-2: Faster Attention with Better Parallelism",
      summary: "A systems paper on improving attention throughput through work partitioning, reduced non-matmul FLOPs, and better GPU parallelism.",
      url: "https://arxiv.org/abs/2307.08691",
      sourceName: "arXiv research continuity",
      publishedAt: "2023-07-17T00:00:00.000Z",
      isFallback: true,
    },
    {
      title: "vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention",
      summary: "A serving-system paper introducing paged attention to reduce KV-cache memory fragmentation and improve request batching.",
      url: "https://arxiv.org/abs/2309.06180",
      sourceName: "arXiv research continuity",
      publishedAt: "2023-09-11T00:00:00.000Z",
      isFallback: true,
    },
    {
      title: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
      summary: "A preference-learning method that replaces a separate reinforcement-learning loop with a direct objective over preference pairs.",
      url: "https://arxiv.org/abs/2305.18290",
      sourceName: "arXiv research continuity",
      publishedAt: "2023-05-29T00:00:00.000Z",
      isFallback: true,
    },
    {
      title: "LoRA: Low-Rank Adaptation of Large Language Models",
      summary: "A parameter-efficient fine-tuning approach that learns low-rank updates while freezing the base model weights.",
      url: "https://arxiv.org/abs/2106.09685",
      sourceName: "arXiv research continuity",
      publishedAt: "2021-06-17T00:00:00.000Z",
      isFallback: true,
    },
    {
      title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      summary: "A retrieval-augmented generation architecture coupling a parametric model with a dense vector index for knowledge-intensive tasks.",
      url: "https://arxiv.org/abs/2005.11401",
      sourceName: "arXiv research continuity",
      publishedAt: "2020-05-22T00:00:00.000Z",
      isFallback: true,
    },
    {
      title: "QLoRA: Efficient Finetuning of Quantized LLMs",
      summary: "A practical fine-tuning technique combining 4-bit quantization, low-rank adapters, and paged optimizers.",
      url: "https://arxiv.org/abs/2305.14314",
      sourceName: "arXiv research continuity",
      publishedAt: "2023-05-23T00:00:00.000Z",
      isFallback: true,
    },
    {
      title: "Training language models to follow instructions with human feedback",
      summary: "The InstructGPT work describing supervised fine-tuning, reward modeling, and human-feedback optimization for aligned assistant behavior.",
      url: "https://arxiv.org/abs/2203.02155",
      sourceName: "arXiv research continuity",
      publishedAt: "2022-03-04T00:00:00.000Z",
      isFallback: true,
    },
    {
      title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
      summary: "A study showing how intermediate reasoning demonstrations can improve performance on multi-step language tasks.",
      url: "https://arxiv.org/abs/2201.11903",
      sourceName: "arXiv research continuity",
      publishedAt: "2022-01-28T00:00:00.000Z",
      isFallback: true,
    },
  ];
}
