import fs from "fs";
import path from "path";
import { SourceItem } from "./sources/types";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filename: string, fallback: T): T {
  ensureDataDir();
  const fp = path.join(DATA_DIR, filename);
  if (!fs.existsSync(fp)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(filename: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(
    path.join(DATA_DIR, filename),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

// ── Types ──

export interface Agent {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  status: "active" | "paused";
}

export interface Post {
  id: string;
  agentId: string;
  text: string;
  rationale: string;
  whyTopicSelected?: string;
  whyRelevantNow?: string;
  sources: string[];
  topicTags: string[];
  createdAt: string;
  editorialScore: number;
  mermaidDiagram?: string;
  metricsCited?: string[];
}

export interface RejectedTopic {
  id: string;
  agentId: string;
  title: string;
  reason: string;
  sourceUrl: string;
  createdAt: string;
}

export interface ScoreBreakdown {
  ai_relevance: number;
  technical_novelty: number;
  scroll_stopping: number;
  source_credibility: number;
}

export interface BacklogItem {
  id: string;
  agentId: string;
  item: SourceItem;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  reason: string;
  addedAt: string;
}

interface SeenEntry {
  url: string;
  outcome: "published" | "rejected" | "backlog";
  firstSeenAt: string;
}

function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "ref"].forEach((key) => parsed.searchParams.delete(key));
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

function sourceKey(url: string): string {
  return Buffer.from(canonicalizeUrl(url)).toString("base64url").substring(0, 40);
}

// ── Agent CRUD ──

export function createAgent(name: string, domain: string): string {
  const agents = readJson<Agent[]>("agents.json", []);
  const existing = agents.find((a) => a.status === "active");
  if (existing) return existing.id;

  const id =
    "agent-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).substring(2, 8);
  agents.push({
    id,
    name,
    domain,
    createdAt: new Date().toISOString(),
    status: "active",
  });
  writeJson("agents.json", agents);
  return id;
}

export function getAgent(agentId: string): Agent | null {
  const agents = readJson<Agent[]>("agents.json", []);
  return agents.find((a) => a.id === agentId) ?? null;
}

export function getActiveAgentId(): string | null {
  const agents = readJson<Agent[]>("agents.json", []);
  return agents.find((a) => a.status === "active")?.id ?? null;
}

// ── Post CRUD ──

export function getPosts(agentId: string): Post[] {
  return readJson<Post[]>("posts.json", [])
    .filter((p) => p.agentId === agentId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export interface PostDigestItem {
  id: string;
  hook: string;
  tags: string[];
  createdAt: string;
}

export function getRecentPostDigest(
  agentId: string,
  limit = 5
): PostDigestItem[] {
  return getPosts(agentId)
    .slice(0, limit)
    .map((p) => {
      const firstLine = p.text.split("\n")[0] || p.text.substring(0, 120);
      return {
        id: p.id,
        hook: firstLine.trim(),
        tags: p.topicTags ?? [],
        createdAt: p.createdAt,
      };
    });
}

export function createPost(
  post: Omit<Post, "id" | "createdAt">
): string {
  const posts = readJson<Post[]>("posts.json", []);
  const id = `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  posts.push({ ...post, id, createdAt: new Date().toISOString() });
  writeJson("posts.json", posts);
  return id;
}

// ── Seen Sources (deduplication) ──

export function isSourceSeen(url: string): boolean {
  const seen = readJson<Record<string, SeenEntry>>("seen.json", {});
  return seen[sourceKey(url)]?.outcome === "published";
}

/** Rejected candidates can be reconsidered after research moves on; published topics never repeat. */
export function isSourceEligibleForReview(url: string, rejectedCooldownDays = 21): boolean {
  const seen = readJson<Record<string, SeenEntry>>("seen.json", {});
  const entry = seen[sourceKey(url)];
  if (!entry || entry.outcome !== "rejected") return true;
  const ageMs = Date.now() - new Date(entry.firstSeenAt).getTime();
  return ageMs >= rejectedCooldownDays * 24 * 60 * 60 * 1000;
}

export function markSourceSeen(
  url: string,
  outcome: "published" | "rejected" | "backlog"
): void {
  const seen = readJson<Record<string, SeenEntry>>("seen.json", {});
  const key = sourceKey(url);
  seen[key] = { url: canonicalizeUrl(url), outcome, firstSeenAt: new Date().toISOString() };
  writeJson("seen.json", seen);
}

// ── Backlog Queue (Content Backlog System) ──

export function getBacklog(agentId?: string): BacklogItem[] {
  const all = readJson<BacklogItem[]>("backlog.json", []);
  const filtered = agentId ? all.filter((b) => b.agentId === agentId) : all;
  return filtered.sort((a, b) => b.score - a.score);
}

export function addToBacklog(
  agentId: string,
  item: SourceItem,
  score: number,
  scoreBreakdown: ScoreBreakdown,
  reason: string
): void {
  const backlog = readJson<BacklogItem[]>("backlog.json", []);
  // Avoid duplicate URLs in backlog
  if (backlog.some((b) => canonicalizeUrl(b.item.url) === canonicalizeUrl(item.url))) return;

  backlog.push({
    id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    agentId,
    item,
    score,
    scoreBreakdown,
    reason,
    addedAt: new Date().toISOString(),
  });

  // Keep backlog sorted by score descending
  backlog.sort((a, b) => b.score - a.score);
  writeJson("backlog.json", backlog);
}

export function isSourceInBacklog(agentId: string, url: string): boolean {
  return getBacklog(agentId).some((item) => canonicalizeUrl(item.item.url) === canonicalizeUrl(url));
}

export function popBestBacklogItem(agentId: string): BacklogItem | null {
  const backlog = readJson<BacklogItem[]>("backlog.json", []);
  const idx = backlog.findIndex((b) => b.agentId === agentId);
  if (idx === -1) return null;

  const [best] = backlog.splice(idx, 1);
  writeJson("backlog.json", backlog);
  return best;
}

export function removeFromBacklog(url: string): void {
  const backlog = readJson<BacklogItem[]>("backlog.json", []);
  const filtered = backlog.filter((b) => b.item.url !== url);
  writeJson("backlog.json", filtered);
}

// ── Rejected Topics ──

export function createRejectedTopic(
  agentId: string,
  title: string,
  reason: string,
  sourceUrl: string
): void {
  const rejected = readJson<RejectedTopic[]>("rejected.json", []);
  rejected.push({
    id: `r-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    agentId,
    title,
    reason,
    sourceUrl,
    createdAt: new Date().toISOString(),
  });
  writeJson("rejected.json", rejected);
}

export function getRejectedTopics(agentId: string): RejectedTopic[] {
  return readJson<RejectedTopic[]>("rejected.json", [])
    .filter((r) => r.agentId === agentId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 80);
}
