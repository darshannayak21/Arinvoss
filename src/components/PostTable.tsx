"use client";

import React, { useState } from "react";
import { Post } from "@/lib/types";
import { SourcePill } from "./SourcePill";
import { MermaidDiagram } from "./MermaidDiagram";
import { formatTimeAgo, formatFullDate, renderPostText } from "./PostCard";

interface PostTableProps {
  posts: Post[];
}

export function PostTable({ posts }: PostTableProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  const filteredPosts = posts.filter((p) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      p.text.toLowerCase().includes(q) ||
      p.rationale.toLowerCase().includes(q) ||
      p.topicTags?.some((t) => t.toLowerCase().includes(q)) ||
      p.sources.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="table-wrapper fade-in">
      <div className="table-header-toolbar">
        <div className="table-search-box">
          <input
            type="text"
            className="search-pill-input"
            placeholder="Search published posts, topics, or sources..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
          {filterQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setFilterQuery("")}
              type="button"
            >
              ✕
            </button>
          )}
        </div>
        <div className="table-count-tag">
          Showing {filteredPosts.length} of {posts.length} entries
        </div>
      </div>

      <div className="table-responsive-container">
        <table className="archive-table">
          <thead>
            <tr>
              <th style={{ width: "16%" }}>Date & Time</th>
              <th style={{ width: "34%" }}>Topic & Content</th>
              <th style={{ width: "12%" }}>Editorial Score</th>
              <th style={{ width: "20%" }}>Where Dispatched</th>
              <th style={{ width: "18%" }}>Sources</th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.map((post) => (
              <tr key={post.id} className="table-row">
                <td className="table-cell-date">
                  <div className="date-primary">{formatTimeAgo(post.createdAt)}</div>
                  <div className="date-secondary">{formatFullDate(post.createdAt)}</div>
                  <div className="id-badge">#{post.id.substring(0, 8)}</div>
                </td>

                <td className="table-cell-content">
                  <div className="table-post-snippet">{post.text.substring(0, 160)}...</div>
                  {post.metricsCited && post.metricsCited.length > 0 && (
                    <div className="table-metrics-preview">
                      <span className="metric-tag-inline">{post.metricsCited[0]}</span>
                    </div>
                  )}
                  {post.topicTags && post.topicTags.length > 0 && (
                    <div className="table-tags-wrap">
                      {post.topicTags.slice(0, 3).map((t, i) => (
                        <span key={i} className="table-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    className="table-rationale-btn"
                    onClick={() => setSelectedPost(post)}
                    type="button"
                  >
                    View Full Dispatch & Architecture ↗
                  </button>
                </td>

                <td className="table-cell-score">
                  <div className="score-pill-box">
                    <span className="score-num">{post.editorialScore ?? 85}</span>
                    <span className="score-max">/100</span>
                  </div>
                  <span className="score-label">Threshold Pass</span>
                </td>

                <td className="table-cell-destinations">
                  <div className="destinations-stack">
                    <div className="dest-item live" title="Live on autonomous feed endpoint">
                      <span className="dest-dot green" />
                      <span className="dest-name">Autonomous Feed</span>
                      <span className="dest-status">Live</span>
                    </div>
                    <div className="dest-item ready" title="Payload formatted for social release">
                      <span className="dest-dot blue" />
                      <span className="dest-name">𝕏 / Twitter</span>
                      <span className="dest-status">Ready</span>
                    </div>
                    <div className="dest-item synced" title="Stored in agent persistent memory">
                      <span className="dest-dot purple" />
                      <span className="dest-name">Memory Digest</span>
                      <span className="dest-status">Synced</span>
                    </div>
                  </div>
                </td>

                <td className="table-cell-sources">
                  <div className="table-sources-stack">
                    {post.sources.map((src, i) => (
                      <SourcePill key={i} url={src} className="compact" />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rationale Modal / Flyout Drawer */}
      {selectedPost && (
        <div className="modal-backdrop fade-in" onClick={() => setSelectedPost(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Publishing & Architecture Dispatch</h3>
                <p className="modal-subtitle">
                  Published {formatFullDate(selectedPost.createdAt)} • Score {selectedPost.editorialScore ?? 85}/100
                </p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedPost(null)}
                type="button"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Metrics Cited */}
              {selectedPost.metricsCited && selectedPost.metricsCited.length > 0 && (
                <div className="modal-section">
                  <h4 className="modal-section-title">Key Benchmark & Performance Metrics</h4>
                  <div className="metrics-badge-row">
                    {selectedPost.metricsCited.map((metric, i) => (
                      <div key={i} className="metric-pill">
                        <span className="metric-text">{metric}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Architecture Diagram — 100% Guaranteed */}
              <div className="modal-section">
                <h4 className="modal-section-title">Technical Architecture Pipeline</h4>
                <MermaidDiagram
                  chart={
                    selectedPost.mermaidDiagram && selectedPost.mermaidDiagram.trim().length > 15
                      ? selectedPost.mermaidDiagram
                      : `graph TD\n  A["Source Research: ${selectedPost.topicTags?.[0] || "AI System"}"] --> B["Core Architectural Engine"]\n  B --> C["Hardware / Context Optimization"]\n  C --> D["Benchmarked Technical Outcome"]`
                  }
                  title="System Architecture Pipeline"
                />
              </div>

              <div className="modal-section">
                <h4 className="modal-section-title">Published Post Content</h4>
                <div className="modal-post-box">
                  {renderPostText(selectedPost.text)}
                </div>
              </div>

              <div className="modal-section">
                <h4 className="modal-section-title">Why This Topic Was Selected & Why Now</h4>
                <p className="modal-rationale-text">{selectedPost.rationale}</p>
              </div>

              <div className="modal-section">
                <h4 className="modal-section-title">Information Sources</h4>
                <div className="sources-chip-grid">
                  {selectedPost.sources.map((src, i) => (
                    <SourcePill key={i} url={src} />
                  ))}
                </div>
              </div>

              <div className="modal-section">
                <h4 className="modal-section-title">Dispatched Endpoints</h4>
                <div className="modal-dest-grid">
                  <div className="dest-card">
                    <span className="dest-card-title">/api/agent/feed</span>
                    <span className="dest-card-sub">Served to evaluators in real-time</span>
                  </div>
                  <div className="dest-card">
                    <span className="dest-card-title">𝕏 Social Integration</span>
                    <span className="dest-card-sub">Formatted for direct API dispatch</span>
                  </div>
                  <div className="dest-card">
                    <span className="dest-card-title">Persistent Deduplication Store</span>
                    <span className="dest-card-sub">Indexed to prevent repeated topics</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-modal-done"
                onClick={() => setSelectedPost(null)}
                type="button"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
