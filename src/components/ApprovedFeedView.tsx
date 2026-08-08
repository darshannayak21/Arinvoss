"use client";

import React, { useState, useMemo } from "react";
import { Post } from "@/lib/types";
import { SourcePill, parseSource } from "./SourcePill";
import { formatTimeAgo, formatFullDate } from "./PostCard";
import { PostCard } from "./PostCard";
import {
  SearchIcon,
  CloseIcon,
  ExternalLinkIcon,
  BenchmarkIcon,
  DiagramIcon,
  PlayIcon,
  SparklesIcon,
  LayersIcon,
} from "./Icons";

interface ApprovedFeedViewProps {
  posts: Post[];
  loading: boolean;
  onSelectPost: (post: Post) => void;
  onRunCycle: () => Promise<void>;
}

type TimeFilter = "all" | "today" | "week" | "month";
type SourceFilter = "all" | "arxiv" | "github" | "hackernews" | "lab";
type LayoutMode = "table" | "cards";

export function ApprovedFeedView({
  posts,
  loading,
  onSelectPost,
  onRunCycle,
}: ApprovedFeedViewProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("table");

  // Calculate today's published count
  const publishedTodayCount = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    return posts.filter(
      (p) =>
        (p.publishedToLinkedin || p.status === "PUBLISHED") &&
        new Date(p.createdAt).getTime() >= startOfToday.getTime()
    ).length;
  }, [posts]);

  // Filtering logic
  const filteredPosts = useMemo(() => {
    const now = new Date().getTime();

    return posts.filter((post) => {
      // 1. Time filter
      if (timeFilter !== "all") {
        const postTime = new Date(post.createdAt).getTime();
        const diffHours = (now - postTime) / (1000 * 60 * 60);

        if (timeFilter === "today" && diffHours > 24) return false;
        if (timeFilter === "week" && diffHours > 24 * 7) return false;
        if (timeFilter === "month" && diffHours > 24 * 30) return false;
      }

      // 2. Source filter
      if (sourceFilter !== "all") {
        const hasMatchingSource = post.sources.some((src) => {
          const { sourceType } = parseSource(src);
          return sourceType === sourceFilter;
        });
        if (!hasMatchingSource) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = post.text.toLowerCase().includes(q);
        const matchesRationale = post.rationale.toLowerCase().includes(q);
        const matchesTags = post.topicTags?.some((t) => t.toLowerCase().includes(q));
        const matchesSources = post.sources.some((s) => s.toLowerCase().includes(q));
        if (!matchesText && !matchesRationale && !matchesTags && !matchesSources) return false;
      }

      return true;
    });
  }, [posts, timeFilter, sourceFilter, searchQuery]);

  return (
    <div className="feed-view-wrapper fade-in">
      {/* Header bar */}
      <div className="view-top-header">
        <div>
          <h1 className="view-title">Approved Editorial Feed</h1>
          <p className="view-subtitle">
            Autonomous technical publications vetted by Scout, Architect Agent, and Critic Guardrail.
          </p>
        </div>

        <div className="view-mode-toggle-group">
          <button
            className={`view-mode-btn ${layoutMode === "table" ? "active" : ""}`}
            onClick={() => setLayoutMode("table")}
            type="button"
            title="Enterprise Data Table View"
          >
            <LayersIcon size={13} style={{ display: "inline-block", marginRight: "5px", verticalAlign: "-2px" }} />
            Data Table
          </button>
          <button
            className={`view-mode-btn ${layoutMode === "cards" ? "active" : ""}`}
            onClick={() => setLayoutMode("cards")}
            type="button"
            title="Full Post Card Stream View"
          >
            <DiagramIcon size={13} style={{ display: "inline-block", marginRight: "5px", verticalAlign: "-2px" }} />
            Card Stream
          </button>
        </div>
      </div>

      {/* Autonomous Quota & LinkedIn Status Banner */}
      <div className="cadence-quota-banner">
        <div className="cadence-banner-left">
          <span className="cadence-pulse-dot" />
          <span className="cadence-title">Autonomous Cadence Active:</span>
          <span className="cadence-subtitle">
            Curate @ 08:00 UTC | Dispatch @ 11:00 & 18:00 UTC (Max 2 posts / day)
          </span>
        </div>
        <div className="cadence-banner-right">
          <span className={`cadence-count-badge ${publishedTodayCount >= 2 ? "limit-reached" : "active"}`}>
            {publishedTodayCount}/2 Dispatched Today
          </span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="filter-toolbar-card">
        {/* Time filters */}
        <div className="filter-group">
          <span className="filter-group-label">Time:</span>
          <div className="filter-pill-row">
            {(
              [
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "week", label: "This Week" },
                { id: "month", label: "This Month" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                className={`filter-pill-btn ${timeFilter === t.id ? "active" : ""}`}
                onClick={() => setTimeFilter(t.id)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category / Source filters */}
        <div className="filter-group">
          <span className="filter-group-label">Sources:</span>
          <div className="filter-pill-row">
            {(
              [
                { id: "all", label: "All Sources" },
                { id: "arxiv", label: "arXiv" },
                { id: "github", label: "GitHub" },
                { id: "hackernews", label: "Hacker News" },
                { id: "lab", label: "Lab Blogs" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                className={`filter-pill-btn ${sourceFilter === s.id ? "active" : ""}`}
                onClick={() => setSourceFilter(s.id)}
                type="button"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Real-time search box */}
        <div className="filter-search-wrap">
          <div className="search-input-container">
            <SearchIcon size={13} className="search-icon" />
            <input
              type="text"
              className="search-input-field"
              placeholder="Search published posts, topics, or metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                type="button"
                aria-label="Clear search query"
              >
                <CloseIcon size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Showing count indicator */}
      <div className="table-status-bar">
        <span className="status-count-text">
          Showing <strong>{filteredPosts.length}</strong> of <strong>{posts.length}</strong> dispatches
        </span>
        {filteredPosts.length < posts.length && (
          <button
            className="filter-reset-link"
            onClick={() => {
              setTimeFilter("all");
              setSourceFilter("all");
              setSearchQuery("");
            }}
            type="button"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Content Rendering: Loading / Empty / Table / Cards */}
      {loading && (
        <div className="loading-state-block fade-in">
          <div className="minimal-spinner" />
          <span className="loading-state-text">Querying autonomous publication feed...</span>
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="dashboard-empty-card fade-in">
          <div className="empty-icon-wrap">
            <SparklesIcon size={22} />
          </div>
          <h2 className="empty-title">Feed is in Clean Slate / Standby</h2>
          <p className="empty-desc">
            No published posts found. Execute a manual discovery cycle or enable Auto-Publish from the sidebar to scout live AI papers.
          </p>
          <button
            className="empty-action-btn"
            onClick={() => {
              void onRunCycle().catch(() => undefined);
            }}
            type="button"
          >
            <PlayIcon size={12} style={{ display: "inline-block", marginRight: "6px", verticalAlign: "-1px" }} />
            Run Discovery Cycle
          </button>
        </div>
      )}

      {!loading && posts.length > 0 && filteredPosts.length === 0 && (
        <div className="dashboard-empty-card fade-in">
          <h2 className="empty-title">No Matching Dispatches</h2>
          <p className="empty-desc">
            No posts matched your current search &ldquo;{searchQuery}&rdquo; and active filters.
          </p>
          <button
            className="empty-action-btn secondary"
            onClick={() => {
              setTimeFilter("all");
              setSourceFilter("all");
              setSearchQuery("");
            }}
            type="button"
          >
            Clear Active Filters
          </button>
        </div>
      )}

      {!loading && filteredPosts.length > 0 && layoutMode === "table" && (
        <div className="enterprise-table-container fade-in">
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th style={{ width: "13%" }}>Status</th>
                <th style={{ width: "12%" }}>Date & Time</th>
                <th style={{ width: "8%" }}>Score</th>
                <th style={{ width: "22%" }}>Topic</th>
                <th style={{ width: "21%" }}>Publishing Rationale</th>
                <th style={{ width: "12%" }}>Source</th>
                <th style={{ width: "12%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => {
                const firstLine = post.text.split("\n")[0] || post.text.slice(0, 100);
                const titleText = post.topicTags?.[0] ? `${post.topicTags[0]}: ${firstLine}` : firstLine;
                const isPublished = post.publishedToLinkedin || post.status === "PUBLISHED";

                return (
                  <tr
                    key={post.id}
                    className="enterprise-table-row"
                    onClick={() => onSelectPost(post)}
                  >
                    {/* Real-time Status Badge */}
                    <td className="table-col-status">
                      {isPublished ? (
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "rgba(16, 185, 129, 0.15)",
                          border: "1px solid rgba(16, 185, 129, 0.4)",
                          color: "#10b981",
                          padding: "4px 8px",
                          borderRadius: "14px",
                          fontSize: "11px",
                          fontWeight: 700,
                          boxShadow: "0 0 10px rgba(16, 185, 129, 0.2)",
                        }}>
                          <span style={{ fontSize: "12px" }}>✓</span>
                          <span>Published</span>
                        </div>
                      ) : (
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          background: "rgba(245, 158, 11, 0.12)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          color: "#fbbf24",
                          padding: "4px 8px",
                          borderRadius: "14px",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}>
                          <span>⏳</span>
                          <span>Queued</span>
                        </div>
                      )}
                    </td>

                    {/* Date & Time */}
                    <td className="table-col-date">
                      <div className="date-relative">{formatTimeAgo(post.createdAt)}</div>
                      <div className="date-iso">{formatFullDate(post.createdAt)}</div>
                      <div className="table-post-id">#{post.id.substring(0, 8)}</div>
                    </td>

                    {/* Score Badge */}
                    <td className="table-col-score">
                      <div className="score-capsule">
                        <span className="score-capsule-num">{post.editorialScore ?? 85}</span>
                        <span className="score-capsule-max">/100</span>
                      </div>
                    </td>

                    {/* Topic Name / Title with hover preview */}
                    <td className="table-col-title">
                      <div className="topic-title-text" title={post.text}>
                        {titleText}
                      </div>

                      {/* Cited metric badge if present */}
                      {post.metricsCited && post.metricsCited.length > 0 && (
                        <div className="table-metric-badge">
                          <BenchmarkIcon size={11} className="metric-badge-svg" />
                          <span className="metric-badge-text">{post.metricsCited[0]}</span>
                        </div>
                      )}

                      {/* Topic Tags */}
                      {post.topicTags && post.topicTags.length > 0 && (
                        <div className="table-topic-chips">
                          {post.topicTags.slice(0, 3).map((t, i) => (
                            <span key={i} className="table-topic-chip">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="table-col-rationale">
                      <span className="rationale-label">Why this was published</span>
                      <p className="rationale-preview" title={post.rationale}>
                        {post.rationale || "Editorial rationale is unavailable for this dispatch."}
                      </p>
                    </td>

                    {/* Primary Source Link */}
                    <td className="table-col-source" onClick={(e) => e.stopPropagation()}>
                      {post.sources && post.sources.length > 0 ? (
                        <SourcePill url={post.sources[0]} className="compact" />
                      ) : (
                        <span className="source-none">ArXiv / GitHub</span>
                      )}
                    </td>

                    {/* Action Column */}
                    <td className="table-col-action" style={{ textAlign: "right" }}>
                      <button
                        className="table-action-view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPost(post);
                        }}
                        type="button"
                      >
                        <span>View Details</span>
                        <ExternalLinkIcon size={11} style={{ display: "inline-block", marginLeft: "4px", verticalAlign: "-1px" }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filteredPosts.length > 0 && layoutMode === "cards" && (
        <div className="cards-stream-view fade-in">
          {filteredPosts.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
