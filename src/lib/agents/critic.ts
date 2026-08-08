/**
 * Critic Guardrail: Automated post-generation validation and sanitization
 * Ensures strict compliance with Aris Voss's anti-hype, high-signal persona.
 */

import { sanitizeMermaidSyntax, synthesizeDeterministicDiagram } from "./architect";

export interface RawPostPayload {
  text: string;
  rationale: string;
  mermaidDiagram?: string;
  metricsCited?: string[];
  sources?: string[];
  topicTags?: string[];
  title?: string;
}

export interface ValidatedPost {
  text: string;
  rationale: string;
  mermaidDiagram: string;
  metricsCited: string[];
  sources: string[];
  topicTags: string[];
  criticWarnings: string[];
}

const BANNED_REPLACEMENTS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\bdelve(?:s|d|ing)?\s+into\b/gi, replacement: "examine" },
  { pattern: /\bdelve(?:s|d|ing)?\b/gi, replacement: "investigate" },
  { pattern: /\brevolutioniz(?:e|es|ed|ing)\b/gi, replacement: "fundamentally upgrade" },
  { pattern: /\bgame-changer\b/gi, replacement: "step-change optimization" },
  { pattern: /\bgame changer\b/gi, replacement: "step-change optimization" },
  { pattern: /\blandscape\b/gi, replacement: "ecosystem" },
  { pattern: /\btestament\b/gi, replacement: "evidence" },
  { pattern: /\bbeacon\b/gi, replacement: "standard" },
  { pattern: /\bunlock(?:s|ed|ing)?\b/gi, replacement: "enable" },
  { pattern: /\bsupercharg(?:e|es|ed|ing)\b/gi, replacement: "accelerate" },
  { pattern: /\bin summary,?\b/gi, replacement: "Bottom line:" },
  { pattern: /\bin conclusion,?\b/gi, replacement: "Bottom line:" },
];

/**
 * Strips all markdown asterisks (**bold** and *italic*) completely from text
 * leaving clean, professional plain text without any asterisk symbols.
 */
export function stripMarkdownAsterisks(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove **bold**
    .replace(/\*([^*]+)\*/g, "$1")   // Remove *italic*
    .replace(/\*{1,3}/g, "")         // Remove any stray asterisks
    .replace(/📌\s*/g, "")           // Remove pin emoji
    .replace(/🔗\s*/g, "Source: ");  // Format link icon cleanly
}

/**
 * Generates exactly 6 high-reach, popular, and topic-specific LinkedIn hashtags.
 */
export function generateEngagementHashtags(topicTags: string[], text: string): string[] {
  const defaults = ["ArtificialIntelligence", "MachineLearning", "DeepLearning", "LLMs", "AIResearch", "TechInnovation"];
  const cleanTags: string[] = [];

  // Convert topic tags to CamelCase hashtags
  for (const tag of topicTags || []) {
    const formatted = tag.replace(/[^a-zA-Z0-9]/g, "");
    if (formatted && formatted.length > 1 && !cleanTags.includes(formatted)) {
      cleanTags.push(formatted);
    }
  }

  // Detect technical keywords from text
  const textLower = (text || "").toLowerCase();
  if (textLower.includes("apple silicon") || textLower.includes("mlx")) cleanTags.push("AppleSilicon");
  if (textLower.includes("rust")) cleanTags.push("RustLang");
  if (textLower.includes("cuda") || textLower.includes("gpu")) cleanTags.push("CUDA");
  if (textLower.includes("benchmark") || textLower.includes("eval")) cleanTags.push("AIBenchmarks");
  if (textLower.includes("agent") || textLower.includes("harness")) cleanTags.push("AIAgents");
  if (textLower.includes("hardware") || textLower.includes("memory")) cleanTags.push("AIHardware");

  // Fill up to 6 unique tags
  for (const def of defaults) {
    if (!cleanTags.includes(def)) {
      cleanTags.push(def);
    }
    if (cleanTags.length >= 6) break;
  }

  return cleanTags.slice(0, 6).map((t) => `#${t}`);
}

/**
 * Validate and clean a generated post before publication
 */
export function validateAndCleanPost(
  payload: RawPostPayload,
  sourceUrl: string
): ValidatedPost {
  const warnings: string[] = [];
  let text = payload.text || "";

  // 1. Scrub banned buzzwords
  for (const { pattern, replacement } of BANNED_REPLACEMENTS) {
    if (pattern.test(text)) {
      warnings.push(`Scrubbed banned buzzword matching: ${pattern}`);
      text = text.replace(pattern, replacement);
    }
  }

  // 2. Strip duplicate inline raw Mermaid diagrams from prose text
  const rawMermaidInline = /(?:```(?:mermaid)?[\s\S]*?```|\b(?:graph|flowchart)\s+(?:LR|TD|TB|RL)[\s\S]*?(?=\n\n|\n📌|📌|$))/gi;
  if (rawMermaidInline.test(text)) {
    text = text.replace(rawMermaidInline, "").trim();
  }

  // 3. Extract any existing hashtags
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const existingHashtags = (text.match(hashtagRegex) || []).slice(0, 6);
  // Remove trailing hashtag block from text temporarily for clean paragraph normalization
  text = text.replace(/(?:^|\n)(#[a-zA-Z0-9_]+\s*)+$/g, "").trim();

  // 4. Enforce clean paragraph whitespace (\n\n)
  const lines = text.split("\n").map((l) => l.trimEnd());
  const formattedBlocks: string[] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      if (currentBlock.length > 0) {
        formattedBlocks.push(currentBlock.join(" "));
        currentBlock = [];
      }
    } else if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      if (currentBlock.length > 0) {
        formattedBlocks.push(currentBlock.join(" "));
        currentBlock = [];
      }
      formattedBlocks.push(trimmed.replace(/^\*\s*/, "• "));
    } else if (trimmed.startsWith("Source:") || trimmed.startsWith("**Source:**")) {
      if (currentBlock.length > 0) {
        formattedBlocks.push(currentBlock.join(" "));
        currentBlock = [];
      }
      formattedBlocks.push(trimmed);
    } else {
      currentBlock.push(trimmed);
    }
  }
  if (currentBlock.length > 0) {
    formattedBlocks.push(currentBlock.join(" "));
  }

  text = formattedBlocks.join("\n\n");

  // 5. Ensure standard CTA footer with source URL is present
  const validSourceUrl = sourceUrl && sourceUrl.startsWith("http") ? sourceUrl : "https://arxiv.org";
  if (!text.includes(validSourceUrl)) {
    warnings.push("Attached missing source CTA footer.");
    text += `\n\nSource: ${validSourceUrl}`;
  }

  // 6. Strip all asterisks across the entire post text
  text = stripMarkdownAsterisks(text);

  // 7. Ensure topic tags are clean
  const topicTags = Array.isArray(payload.topicTags) && payload.topicTags.length > 0
    ? payload.topicTags.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    : ["LLMs", "AI Systems", "Engineering"];

  // 8. Enforce exactly 6 high-engagement hashtags at the very bottom
  const finalHashtags = existingHashtags.length >= 6
    ? existingHashtags.slice(0, 6)
    : generateEngagementHashtags(topicTags, text);

  text += `\n\n${finalHashtags.join(" ")}`;

  // 9. Validate & sanitize Mermaid diagram string (with 100% guarantee fallback)
  let diagram: string = sanitizeMermaidSyntax(payload.mermaidDiagram || "");
  if (!diagram || diagram.length < 15) {
    warnings.push("Mermaid diagram was missing or invalid; synthesized architectural pipeline.");
    diagram = sanitizeMermaidSyntax(
      synthesizeDeterministicDiagram(payload.title || "AI Research Pipeline", text, "Research Source")
    );
  }

  // 10. Clean & deduplicate metrics cited
  const rawMetrics = Array.isArray(payload.metricsCited) ? payload.metricsCited : [];
  const metricsCited = rawMetrics
    .filter((m): m is string => typeof m === "string" && m.trim().length > 0)
    .map((m) => stripMarkdownAsterisks(m.trim().replace(/^[-•*]\s*/, "")))
    .slice(0, 4);

  const sources = Array.isArray(payload.sources) && payload.sources.length > 0
    ? payload.sources.filter((s): s is string => typeof s === "string" && s.startsWith("http"))
    : [validSourceUrl];

  if (sources.length === 0) {
    sources.push(validSourceUrl);
  }

  return {
    text: text.trim(),
    rationale: payload.rationale?.trim() || "Selected for high technical novelty and practical engineering impact.",
    mermaidDiagram: diagram,
    metricsCited,
    sources,
    topicTags,
    criticWarnings: warnings,
  };
}
