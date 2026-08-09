import { callScout } from "../groq";
import { SourceItem } from "../sources/types";
import { ScoreBreakdown } from "../store";

const SCOUT_SYSTEM_PROMPT = `You are an elite AI Research Scout. Evaluate topics from 0-100 on 4 pillars:
1. ai_relevance (0-25): Strictly AI/LLMs/neural networks/ML systems (0 if general web/SaaS/crypto).
2. technical_novelty (0-25): Real architectural breakthrough, CUDA kernel, or open weights (not PR fluff).
3. scroll_stopping (0-30): IMPACT AND BROAD APPLICABILITY. If a project makes local LLMs 25% faster, reduces VRAM by 50%, or solves a massive general problem, give it a 30/30. Explainability and practitioner interest are key.
4. source_credibility (0-20): arXiv, Hugging Face, top lab blog, or starred GitHub.

Output JSON ONLY:
{
  "ai_relevance": 0-25,
  "technical_novelty": 0-25,
  "scroll_stopping": 0-30,
  "source_credibility": 0-20,
  "reason": "2-3 sentences naming the exact missing technical evidence, novelty gap, relevance gap, or credibility limitation. Never say only that another topic outscored it."
}`;

function buildCriticalJustification(
  modelReason: string | undefined,
  score: number,
  breakdown: ScoreBreakdown
): string {
  const gaps: string[] = [];
  if (breakdown.ai_relevance < 15) gaps.push(`AI relevance is only ${breakdown.ai_relevance}/25`);
  if (breakdown.technical_novelty < 16) gaps.push(`technical novelty is only ${breakdown.technical_novelty}/25`);
  if (breakdown.scroll_stopping < 18) gaps.push(`practical researcher impact is only ${breakdown.scroll_stopping}/30`);
  if (breakdown.source_credibility < 12) gaps.push(`source evidence is only ${breakdown.source_credibility}/20`);

  const assessment = modelReason?.trim() || "The available material did not substantiate a distinct research contribution.";
  if (score >= 75 && breakdown.ai_relevance >= 15) return assessment;

  const primaryGap = gaps.slice(0, 2).join("; ") || "the evidence did not clear the editorial bar";
  return `${assessment} The decision was driven by ${primaryGap}, for a total of ${score}/100 against the 75-point publication threshold. To reconsider, the source needs a concrete mechanism, reproducible benchmark or ablation evidence, and a clearly current research implication.`;
}

export interface ScoutResult {
  worth_publishing: boolean;
  score: number;
  breakdown: ScoreBreakdown;
  reason: string;
}

export async function runScout(item: SourceItem): Promise<ScoutResult> {
  const shortSummary = item.summary.substring(0, 220);
  const shortReadme = item.readmeSnippet ? item.readmeSnippet.substring(0, 250) : "";
  const userPrompt = `Topic: ${item.title}
Summary: ${shortSummary}
${shortReadme ? `README Extract: ${shortReadme}\n` : ""}Source: ${item.sourceName} (${item.url})

Score this candidate using the 4 pillars.`;

  try {
    const raw = await callScout(SCOUT_SYSTEM_PROMPT, userPrompt);
    const parsed = JSON.parse(raw) as {
      ai_relevance?: number;
      technical_novelty?: number;
      scroll_stopping?: number;
      source_credibility?: number;
      reason?: string;
    };

    const ai = Math.min(25, Math.max(0, Number(parsed.ai_relevance) || 0));
    const novelty = Math.min(25, Math.max(0, Number(parsed.technical_novelty) || 0));
    const scroll = Math.min(30, Math.max(0, Number(parsed.scroll_stopping) || 0));
    const credibility = Math.min(20, Math.max(0, Number(parsed.source_credibility) || 0));

    const totalScore = ai + novelty + scroll + credibility;
    const worth_publishing = totalScore >= 75 && ai >= 15 && scroll >= 18;

    const breakdown: ScoreBreakdown = {
      ai_relevance: ai,
      technical_novelty: novelty,
      scroll_stopping: scroll,
      source_credibility: credibility,
    };

    return {
      worth_publishing,
      score: totalScore,
      breakdown,
      reason: buildCriticalJustification(parsed.reason, totalScore, breakdown),
    };
  } catch (err) {
    console.error("[Scout] Parse error:", err);
    return {
      worth_publishing: false,
      score: 0,
      breakdown: {
        ai_relevance: 0,
        technical_novelty: 0,
        scroll_stopping: 0,
        source_credibility: 0,
      },
      reason: "The candidate was not selected because the research scout could not obtain a reliable evaluation from the available source material. It should be retried with an accessible primary paper, repository README, or benchmark evidence before publication.",
    };
  }
}
