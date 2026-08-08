export interface SourceItem {
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  publishedAt: string; // ISO 8601
  readmeSnippet?: string; // Truncated first 2,000 chars of repository README / technical docs
  /** Older primary material used only when live discovery has no viable candidates. */
  isFallback?: boolean;
}
