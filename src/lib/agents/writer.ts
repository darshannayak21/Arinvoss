import { callWriter } from "../groq";
import { SourceItem } from "../sources/types";
import { PostDigestItem } from "../store";
import { validateAndCleanPost } from "./critic";
import { generateArchitectureDiagram } from "./architect";

function buildWriterSystemPrompt(
  recentPostsDigest: string,
  sourceUrl: string,
  isFallback: boolean
): string {
  const timingFrame = isFallback
    ? "This is a Technical Deep Dive / Foundational Re-examination. Never imply it was released today, just announced, or breaking news. Explain its present relevance through a current engineering question."
    : "This is a live discovery item. You may describe it as a recent update only when the supplied publication date supports that claim.";

  return `You are an active AI Systems Research Engineer building autonomous pipelines, LLM agent architectures, and high-throughput neural inference systems.

YOUR PERSONA & IDENTITY:
- Tone: Punchy, authoritative, concise, and builder-centric.
- Perspective: Written from the trenches by an active AI systems engineer who tests architectures in production.
- Avoid press-release jargon ("In a groundbreaking study...", "delve into"). Dive directly into the core engineering bottleneck and mechanism.
- Never use markdown asterisks (**, *, ***) anywhere in your text. Write clean, natural plain text.

STRICT DISPATCH FORMAT TEMPLATE (Follow this exact structure every time):

[Opening hook highlighting the concrete engineering bottleneck or breakthrough in 1-2 punchy lines]

[Core solution explanation in 2 conversational sentences detailing how the mechanism works]

Key takeaways:

• [Takeaway 1: Focus on System Performance/Efficiency with concrete metrics or benchmark numbers]

• [Takeaway 2: Focus on Architecture/Implementation mechanism]

• [Takeaway 3: Focus on Impact/Developer Experience or deployment trade-off]

If you are building [relevant domain, e.g. AI agents / local LLM tools / inference kernels], this architecture is essential to study.

Source: ${sourceUrl}


#Hashtag1 #Hashtag2 #Hashtag3 #Hashtag4 #Hashtag5 #Hashtag6

---
RULES:
1. LENGTH: 120-170 words excluding source URL and hashtags.
2. BULLETS: Exactly 3 bullets under "Key takeaways:" using bullet (•) or hyphen (-).
3. HASHTAGS: Exactly 6 unique, viral, and topic-tailored hashtags at the bottom.
4. METRICS CITED: Extract 2-4 concrete performance numbers or benchmark measurements.
5. NO FLUFF: Zero words like "game-changer", "delve", "landscape", "testament", "beacon".

---
TEMPORAL ACCURACY:
${timingFrame}

INTELLECTUAL CONTINUITY:
${recentPostsDigest}

---
GOLDEN REFERENCE POST:

[Input Topic]: "FlashAttention-3: Fast and Memory-Efficient Exact Attention"

[Expected Output]:
{
  "text": "Memory bandwidth—not raw FLOPs—is still the primary bottleneck in modern transformer inference.\\n\\nFlashAttention-3 restructures exact attention around hardware-aware CUDA warp scheduling, eliminating redundant HBM reads and writes rather than approximating the math.\\n\\nKey takeaways:\\n\\n• Achieves up to 2x speedup on NVIDIA H100 GPUs under reported benchmark loads.\\n\\n• Interleaved memory operations enable practical long-context training up to 128k tokens.\\n\\n• Lowers memory bandwidth pressure without altering model weights or loss curves.\\n\\nIf you are building high-throughput inference engines or long-context LLM pipelines, this architecture is essential to study.\\n\\nSource: https://github.com/Dao-AILab/flash-attention\\n\\n#ArtificialIntelligence #MachineLearning #CUDA #LLMs #DeepLearning #AIHardware",
  "rationale": "FlashAttention-3 solves a fundamental GPU memory bandwidth bottleneck in LLM training and inference.",
  "whyTopicSelected": "Essential kernel-level breakthrough with direct relevance to production AI engineers.",
  "whyRelevantNow": "Hardware-aware scheduling optimizations are critical for scaling modern context windows.",
  "metricsCited": ["Up to 2x speedup on H100 GPUs", "128k token context practical support", "Zero loss approximation"],
  "topicTags": ["CUDA", "Attention Mechanisms", "LLM Inference"]
}

OUTPUT FORMAT (STRICT JSON):
Respond ONLY with valid JSON in this exact shape:
{
  "text": "The full post text following the exact 6-step dispatch format template.",
  "rationale": "Why this topic was selected and why it matters now.",
  "whyTopicSelected": "Specific editorial reason.",
  "whyRelevantNow": "Specific timeliness reason.",
  "metricsCited": ["metric 1", "metric 2"],
  "topicTags": ["tag1", "tag2", "tag3"]
}`;
}

export interface WriterResult {
  text: string;
  rationale: string;
  whyTopicSelected: string;
  whyRelevantNow: string;
  sources: string[];
  topicTags: string[];
  mermaidDiagram: string;
  metricsCited: string[];
}

export async function runWriter(
  item: SourceItem,
  scoutReason: string,
  recentDigest: PostDigestItem[]
): Promise<WriterResult> {
  const digestStr =
    recentDigest.length > 0
      ? recentDigest
          .map(
            (p, i) =>
              `${i + 1}. [${p.tags.join(", ")}] "${p.hook}" (Published ${p.createdAt})`
          )
          .join("\n")
      : "(no previous posts yet — this is your inaugural publication)";

  const systemPrompt = buildWriterSystemPrompt(digestStr, item.url, Boolean(item.isFallback));

  const userPrompt = `Candidate AI Topic: ${item.title}

Scout's Gatekeeper Assessment: ${scoutReason}

Source Details & Abstract:
${item.summary}
${item.readmeSnippet ? `\nExtracted Technical README & Benchmarks:\n${item.readmeSnippet.slice(0, 2200)}\n` : ""}
Source URL: ${item.url}
Source Platform: ${item.sourceName}
Published Date: ${item.publishedAt}
Editorial framing: ${item.isFallback ? "Foundational technical deep dive; do not frame as breaking news." : "Live discovery; use the source date accurately."}

Generate this post strictly in Aris Voss's locked-in persona, fixed LinkedIn structure, concise spacing, and concrete metrics. The Architecture Agent handles diagrams separately.`;

  try {
    const raw = await callWriter(systemPrompt, userPrompt);
    const parsed = JSON.parse(raw) as {
      text?: string;
      rationale?: string;
      whyTopicSelected?: string;
      whyRelevantNow?: string;
      sources?: string[];
      topicTags?: string[];
      mermaidDiagram?: string;
      metricsCited?: string[];
    };

    if (!parsed.text || typeof parsed.text !== "string") {
      throw new Error("Writer returned empty text");
    }

    // The dedicated Architecture Agent independently maps the source material.
    console.log(`[Architect Agent] Generating research-grade diagram for: "${item.title}"`);
    const diagram = await generateArchitectureDiagram(item, parsed.text);

    // Pass through Critic Audit Guardrail
    const validated = validateAndCleanPost(
      {
        text: parsed.text,
        rationale: parsed.rationale || "",
        mermaidDiagram: diagram,
        metricsCited: parsed.metricsCited,
        sources: parsed.sources,
        topicTags: parsed.topicTags,
        title: item.title,
      },
      item.url
    );

    if (validated.criticWarnings.length > 0) {
      console.log(`[Critic Audit] Applied ${validated.criticWarnings.length} rule fixes:`, validated.criticWarnings);
    }

    return {
      text: validated.text,
      rationale: validated.rationale,
      whyTopicSelected: parsed.whyTopicSelected?.trim() || validated.rationale,
      whyRelevantNow: parsed.whyRelevantNow?.trim() || validated.rationale,
      sources: validated.sources,
      topicTags: validated.topicTags,
      mermaidDiagram: validated.mermaidDiagram,
      metricsCited: validated.metricsCited,
    };
  } catch (err) {
    console.error("[Writer] Error during writer execution:", err);

    // Fallback generation if LLM writer errors
    const fallbackDiagram = await generateArchitectureDiagram(item, item.summary);
    const validated = validateAndCleanPost(
      {
        text: `${item.title}\n\n${item.summary}\n\n**Key Engineering Takeaway:**\n\n- **Core Impact:** Accelerates model development with hardware-aware optimization.\n\n**Source:** ${item.url}`,
        rationale: scoutReason || "Selected for high technical novelty and practical engineering impact.",
        mermaidDiagram: fallbackDiagram,
        metricsCited: ["Production-grade AI optimization", "Novel architectural pipeline"],
        sources: [item.url],
        topicTags: ["AI Research", "Deep Learning", "Systems"],
        title: item.title,
      },
      item.url
    );

    return {
      text: validated.text,
      rationale: validated.rationale,
      whyTopicSelected: scoutReason || validated.rationale,
      whyRelevantNow: item.isFallback
        ? "This foundational work remains relevant because its engineering trade-offs continue to shape current AI systems."
        : `The source was published on ${item.publishedAt}, making its engineering implications timely for the current AI research cycle.`,
      sources: validated.sources,
      topicTags: validated.topicTags,
      mermaidDiagram: validated.mermaidDiagram,
      metricsCited: validated.metricsCited,
    };
  }
}
