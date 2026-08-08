"use client";

import React, { useState } from "react";
import { Post } from "@/lib/types";
import { SourcePill } from "./SourcePill";
import { MermaidDiagram } from "./MermaidDiagram";
import { formatFullDate, formatTimeAgo, renderPostText } from "./PostCard";
import { sanitizeMermaidSyntax, synthesizeDeterministicDiagram } from "@/lib/agents/architect";

interface PostDetailDrawerProps {
  post: Post | null;
  onClose: () => void;
}

export function PostDetailDrawer({ post, onClose }: PostDetailDrawerProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!post) return null;

  const handleCopyPermalink = () => {
    navigator.clipboard?.writeText?.(`${window.location.origin}/#${post.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const activeDiagram = post.mermaidDiagram && post.mermaidDiagram.trim().length > 15
    ? post.mermaidDiagram
    : sanitizeMermaidSyntax(
        synthesizeDeterministicDiagram(
          post.topicTags?.[0] || "AI Research Pipeline",
          post.text,
          post.sources?.[0] || "ArXiv / GitHub"
        )
      );
  const whyTopicSelected = post.whyTopicSelected || post.rationale;
  const whyRelevantNow = post.whyRelevantNow || post.rationale;

  return (
    <div className="drawer-backdrop fade-in" onClick={onClose}>
      <aside
        className="detail-slide-over"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Post dispatch details"
      >
        <div className="drawer-top-header">
          <div className="drawer-header-info">
            <div className="drawer-badge-row">
              <span className="drawer-post-id">#{post.id.substring(0, 10)}</span>
              <span className="drawer-score-pill">Score {post.editorialScore ?? 85}/100</span>
              <span className="drawer-time-tag" title={formatFullDate(post.createdAt)}>
                {formatTimeAgo(post.createdAt)} · {formatFullDate(post.createdAt)}
              </span>
            </div>
            <h2 className="drawer-headline">
              {post.topicTags?.[0] ? `${post.topicTags[0]} Dispatch` : "Autonomous AI Dispatch"}
            </h2>
          </div>
          <div className="drawer-top-actions">
            <button className="drawer-action-btn" onClick={handleCopyPermalink} type="button">
              {copiedLink ? "Link copied" : "Copy link"}
            </button>
            <button className="drawer-close-btn" onClick={onClose} type="button" aria-label="Close details">×</button>
          </div>
        </div>

        <div className="drawer-scroll-body drawer-details-body">
          <section className="drawer-detail-section">
            <span className="drawer-subheading">Published post</span>
            <div className="drawer-post-text-box">
              <div className="drawer-markdown-render">{renderPostText(post.text)}</div>
            </div>
          </section>

          <section className="drawer-detail-section publishing-rationale-section">
            <div className="pane-intro">
              <h3 className="pane-title">Publishing rationale</h3>
              <p className="pane-desc">The editorial record retained with every published dispatch.</p>
            </div>
            <div className="rationale-detail-grid">
              <div className="rationale-detail-card">
                <span className="drawer-subheading">Why this topic was selected</span>
                <p className="decision-text">{whyTopicSelected || "No selection rationale was recorded."}</p>
              </div>
              <div className="rationale-detail-card">
                <span className="drawer-subheading">Why it is relevant now</span>
                <p className="decision-text">{whyRelevantNow || "No relevance rationale was recorded."}</p>
              </div>
            </div>
            <div className="rationale-detail-card source-rationale-card">
              <span className="drawer-subheading">Information sources</span>
              <div className="sources-chip-grid">
                {post.sources.map((src, i) => <SourcePill key={i} url={src} />)}
              </div>
            </div>
          </section>

          {post.metricsCited && post.metricsCited.length > 0 && (
            <section className="drawer-detail-section">
              <span className="drawer-subheading">Key benchmarks</span>
              <div className="metrics-badge-row">
                {post.metricsCited.map((metric, i) => <div key={i} className="metric-pill"><span className="metric-text">{metric}</span></div>)}
              </div>
            </section>
          )}

          {post.topicTags && post.topicTags.length > 0 && (
            <section className="drawer-detail-section">
              <span className="drawer-subheading">Topics</span>
              <div className="post-tags-row">
                {post.topicTags.map((tag, i) => <span key={i} className="post-tag-chip">{tag}</span>)}
              </div>
            </section>
          )}

          <section className="drawer-detail-section">
            <span className="drawer-subheading">Architecture flow</span>
            <MermaidDiagram chart={activeDiagram} title="System Pipeline" />
          </section>
        </div>

        <div className="drawer-bottom-footer">
          <button className="drawer-close-action" onClick={onClose} type="button">Close details</button>
        </div>
      </aside>
    </div>
  );
}
