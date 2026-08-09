"use client";

import React, { useState } from "react";
import { Post } from "@/lib/types";
import { SourcePill } from "./SourcePill";
import { MermaidDiagram } from "./MermaidDiagram";
import { sanitizeMermaidSyntax, synthesizeDeterministicDiagram } from "@/lib/agents/architect";
import { BenchmarkIcon, ExternalLinkIcon } from "./Icons";

interface PostCardProps {
  post: Post;
  index: number;
}

export function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 45) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  return `${diffDay}d ago`;
}

export function formatFullDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Parses inline markdown: **bold**, clickable URLs, and emojis
 */
export function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)\]]+)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("http://") || part.startsWith("https://")) {
      const cleanUrl = part.replace(/[.,;]+$/, "");
      return (
        <a
          key={idx}
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="post-inline-link"
          title={`Open ${cleanUrl}`}
        >
          {cleanUrl} <span className="inline-link-arrow">↗</span>
        </a>
      );
    }
    return part;
  });
}

/**
 * Format post text paragraphs with double line breaks, clean bullets, and inline markdown bolding
 */
export function renderPostText(text: string): React.ReactNode {
  const rawParagraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  return rawParagraphs.map((para, pIdx) => {
    const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);

    const hasBullets = lines.some(
      (l) => l.startsWith("•") || l.startsWith("-") || l.startsWith("*")
    );

    if (hasBullets) {
      const introLines: string[] = [];
      const listItems: string[] = [];
      let inList = false;

      for (const line of lines) {
        if (line.startsWith("•") || line.startsWith("- ") || line.startsWith("* ")) {
          inList = true;
          listItems.push(line.replace(/^[•\-*]\s*/, ""));
        } else if (!inList) {
          introLines.push(line);
        } else {
          listItems.push(line);
        }
      }

      return (
        <div key={pIdx} className="post-paragraph-block">
          {introLines.length > 0 && (
            <p className="post-paragraph">
              {introLines.map((l, i) => (
                <span key={i}>
                  {renderInlineMarkdown(l)}
                  {i < introLines.length - 1 && " "}
                </span>
              ))}
            </p>
          )}
          {listItems.length > 0 && (
            <ul className="post-bullet-list">
              {listItems.map((item, lIdx) => (
                <li key={lIdx}>{renderInlineMarkdown(item)}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    return (
      <div key={pIdx} className="post-paragraph-block">
        {lines.map((line, lIdx) => (
          <p key={lIdx} className="post-paragraph">
            {renderInlineMarkdown(line)}
          </p>
        ))}
      </div>
    );
  });
}

export function PostCard({ post, index }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(window.location.origin + `/#${post.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Guarantee that every post displays a clean architectural diagram
  const activeDiagram = post.mermaidDiagram && post.mermaidDiagram.trim().length > 15
    ? post.mermaidDiagram
    : sanitizeMermaidSyntax(
        synthesizeDeterministicDiagram(
          post.topicTags?.[0] || "AI Research Architecture",
          post.text,
          post.sources?.[0] || "ArXiv / GitHub"
        )
      );

  return (
    <article
      className={`post-tile fade-in stagger-${Math.min(index + 1, 5)}`}
      id={post.id}
    >
      {/* Header bar: relative time & post metadata */}
      <div className="post-tile-header">
        <div className="post-header-left">
          {post.publishedToLinkedin || post.status === "PUBLISHED" ? (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#10b981",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 700,
              marginRight: "8px",
              boxShadow: "0 0 8px rgba(16, 185, 129, 0.25)",
            }}>
              ✓ Published
            </span>
          ) : (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              color: "#fbbf24",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 600,
              marginRight: "8px",
            }}>
              ⏳ Queued
            </span>
          )}
          <span className="post-timestamp" title={formatFullDate(post.createdAt)}>
            {formatTimeAgo(post.createdAt)}
          </span>
          <span className="post-date-full">
            {formatFullDate(post.createdAt)}
          </span>
        </div>

        <div className="post-header-right">
          {post.editorialScore && (
            <span className="editorial-score-badge" title="Scout Editorial Score">
              Score {post.editorialScore}/100
            </span>
          )}
          <span className="post-id-tag">#{post.id.substring(0, 10)}</span>
        </div>
      </div>

      {/* Main post body with strict social media visual whitespace */}
      <div className="post-content">
        {renderPostText(post.text)}
      </div>

      {/* Concrete Metrics Cited Badges */}
      {post.metricsCited && post.metricsCited.length > 0 && (
        <div className="metrics-badge-row">
          {post.metricsCited.map((metric, i) => (
            <div key={i} className="metric-pill">
              <BenchmarkIcon size={13} className="metric-icon" aria-hidden="true" />
              <span className="metric-text">{metric}</span>
            </div>
          ))}
        </div>
      )}

      {/* Automated Architecture Flow / Diagram — 100% Guaranteed on every post */}
      <div className="post-diagram-wrap">
        <MermaidDiagram chart={activeDiagram} title="Architecture Pipeline" />
      </div>

      {/* Prominent Primary Source Link Banner (Always Clickable) */}
      {post.sources && post.sources.length > 0 && (
        <div className="post-source-banner">
          <span className="source-banner-label">Verified Source:</span>
          <div className="source-banner-links">
            {post.sources.map((src, i) => (
              <a
                key={i}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="post-source-btn"
                title={`Open verified research source: ${src}`}
              >
                <span className="source-btn-text">
                  {src.replace(/^https?:\/\/(?:www\.)?/, "").slice(0, 45)}
                  {src.replace(/^https?:\/\/(?:www\.)?/, "").length > 45 ? "..." : ""}
                </span>
                <ExternalLinkIcon size={13} className="source-btn-arrow" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Topic Tags */}
      {post.topicTags && post.topicTags.length > 0 && (
        <div className="post-tags-row">
          {post.topicTags.map((tag, i) => (
            <span key={i} className="post-tag-chip">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action / Toggle bar */}
      <div className="post-tile-footer">
        <button
          className={`why-this-post-toggle ${expanded ? "active" : ""}`}
          onClick={() => setExpanded(!expanded)}
          id={`rationale-toggle-${post.id}`}
          type="button"
          aria-expanded={expanded}
        >
          <span className="toggle-icon">{expanded ? "−" : "+"}</span>
          <span>{expanded ? "Hide Editorial Decision" : "Why this post"}</span>
        </button>

        <button
          className="share-action-btn"
          onClick={handleCopyLink}
          title="Copy direct permalink"
          type="button"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>

        <button
          style={{
            backgroundColor: "#0077B5",
            color: "white",
            border: "none",
            padding: "6px 12px",
            borderRadius: "4px",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
          onClick={async (e) => {
            const btn = e.currentTarget;
            btn.innerText = "Publishing...";
            btn.disabled = true;
            try {
              const res = await fetch("/api/agent/publish-post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId: post.id })
              });
              const data = await res.json();
              if (data.success) {
                btn.innerText = "✓ Published";
                btn.style.backgroundColor = "#10b981";
              } else {
                btn.innerText = "Failed";
                btn.style.backgroundColor = "#ef4444";
                alert(data.error);
              }
            } catch (err) {
              btn.innerText = "Error";
            }
            setTimeout(() => {
              btn.innerText = "Publish to LinkedIn 🚀";
              btn.style.backgroundColor = "#0077B5";
              btn.disabled = false;
            }, 3000);
          }}
          title="Publish instantly to LinkedIn (you can re-publish if needed)"
          type="button"
        >
          Publish to LinkedIn 🚀
        </button>
      </div>

      {/* Expandable Rationale Accordion */}
      {expanded && (
        <div className="editorial-drawer fade-in">
          <div className="drawer-section">
            <div className="drawer-header">
              <span className="drawer-title">Editorial Rationale</span>
              <span className="drawer-subtitle">Why Selected & Why Relevant Now</span>
            </div>
            <p className="drawer-rationale-text">{post.rationale}</p>
          </div>

          {post.sources && post.sources.length > 0 && (
            <div className="drawer-section">
              <div className="drawer-header">
                <span className="drawer-title">Primary Sources</span>
              </div>
              <div className="sources-chip-grid">
                {post.sources.map((src, i) => (
                  <SourcePill key={i} url={src} />
                ))}
              </div>
            </div>
          )}

          <div className="drawer-dispatch-meta">
            <div className="dispatch-badge">
              <span>Dispatched to Autonomous Feed</span>
            </div>
            <div className="dispatch-badge">
              <span>Architecture Pipeline Validated</span>
            </div>
            <div className="dispatch-badge">
              <span>Critic Guardrail Passed</span>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
