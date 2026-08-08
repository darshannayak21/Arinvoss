export type PostStatus = "DRAFT" | "QUEUED" | "PUBLISHED";

export interface Post {
  id: string;
  agentId?: string;
  createdAt: string;
  status?: PostStatus;
  text: string;
  rationale: string;
  whyTopicSelected?: string;
  whyRelevantNow?: string;
  sources: string[];
  topicTags?: string[];
  editorialScore?: number;
  mermaidDiagram?: string;
  imageUrl?: string;
  metricsCited?: string[];
  publishedToLinkedin?: boolean;
  linkedinPublishedAt?: string | null;
}

export interface RejectedTopic {
  id?: string;
  title: string;
  reason: string;
  sourceUrl: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  status: "active" | "paused";
}
