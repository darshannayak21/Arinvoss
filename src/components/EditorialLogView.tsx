"use client";

import React, { useState, useMemo } from "react";
import { RejectedTopic } from "@/lib/types";
import { SourcePill, parseSource } from "./SourcePill";
import { formatTimeAgo, formatFullDate } from "./PostCard";
import {
  SearchIcon,
  CloseIcon,
  CrossIcon,
  TargetIcon,
  BenchmarkIcon,
  PlayIcon,
  EditorialLogIcon,
} from "./Icons";

interface EditorialLogViewProps {
  rejected: RejectedTopic[];
  postCount: number;
  loading: boolean;
  onRunCycle: () => Promise<void>;
}

type SourceFilter = "all" | "arxiv" | "github" | "hackernews" | "lab";

function presentCriticalJustification(reason: string): string {
  if (/outscored|better candidate/i.test(reason)) {
    return "This legacy decision only retained a queue comparison, not the underlying rubric notes. New decisions record the precise novelty, evidence, relevance, and timeliness gaps required for reconsideration.";
  }
  return reason;
}

export function EditorialLogView({
  rejected,
  postCount,
  loading,
  onRunCycle,
}: EditorialLogViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<SourceFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const totalEvaluated = rejected.length + postCount;
  const selectivity =
    totalEvaluated > 0
      ? Math.round((rejected.length / totalEvaluated) * 100)
      : 0;

  const filteredList = useMemo(() => {
    return rejected.filter((item) => {
      // Source filter
      if (selectedFilter !== "all") {
        const { sourceType } = parseSource(item.sourceUrl || "");
        if (sourceType !== selectedFilter) return false;
      }

      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesReason = item.reason.toLowerCase().includes(q);
        const matchesUrl = item.sourceUrl.toLowerCase().includes(q);
        if (!matchesTitle && !matchesReason && !matchesUrl) return false;
      }

      return true;
    });
  }, [rejected, selectedFilter, searchQuery]);

  return (
    <div className="editorial-view-wrapper fade-in">
      {/* Header */}
      <div className="view-top-header">
        <div>
          <h1 className="view-title">Editorial Transparency Log</h1>
          <p className="view-subtitle">
            Every candidate paper, repository, and release Aris evaluated and filtered out to maintain high signal density.
          </p>
        </div>
      </div>

      {/* Top 4 Summary Metric Cards */}
      <div className="metrics-summary-grid">
        <div className="summary-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Topics Evaluated</span>
            <SearchIcon size={14} className="stat-card-icon-svg" />
          </div>
          <div className="stat-card-value">{totalEvaluated}</div>
          <div className="stat-card-note">Ingested across all sources</div>
        </div>

        <div className="summary-stat-card danger">
          <div className="stat-card-top">
            <span className="stat-card-label">Filtered Out</span>
            <CrossIcon size={14} className="stat-card-icon-svg text-danger" />
          </div>
          <div className="stat-card-value text-danger">{rejected.length}</div>
          <div className="stat-card-note">Below novelty/relevance bar</div>
        </div>

        <div className="summary-stat-card accent">
          <div className="stat-card-top">
            <span className="stat-card-label">Published</span>
            <BenchmarkIcon size={14} className="stat-card-icon-svg text-accent" />
          </div>
          <div className="stat-card-value text-accent">{postCount}</div>
          <div className="stat-card-note">Passed Scout 100-pt rubric</div>
        </div>

        <div className="summary-stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Selectivity Rate</span>
            <TargetIcon size={14} className="stat-card-icon-svg" />
          </div>
          <div className="stat-card-value">{selectivity}%</div>
          <div className="stat-card-note">Strict gatekeeper ratio</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="filter-toolbar-card">
        <div className="filter-group">
          <span className="filter-group-label">Source:</span>
          <div className="filter-pill-row">
            {(
              [
                { id: "all", label: `All (${rejected.length})` },
                { id: "arxiv", label: "arXiv" },
                { id: "github", label: "GitHub" },
                { id: "hackernews", label: "Hacker News" },
                { id: "lab", label: "Lab Blogs" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                className={`filter-pill-btn ${selectedFilter === s.id ? "active" : ""}`}
                onClick={() => setSelectedFilter(s.id)}
                type="button"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-search-wrap">
          <div className="search-input-container">
            <SearchIcon size={13} className="search-icon" />
            <input
              type="text"
              className="search-input-field"
              placeholder="Search filtered topics or rejection rationales..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                type="button"
                aria-label="Clear search"
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
          Showing <strong>{filteredList.length}</strong> of <strong>{rejected.length}</strong> logged decisions
        </span>
        {filteredList.length < rejected.length && (
          <button
            className="filter-reset-link"
            onClick={() => {
              setSelectedFilter("all");
              setSearchQuery("");
            }}
            type="button"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Content: Loading / Empty / Rejections Table */}
      {loading && (
        <div className="loading-state-block fade-in">
          <div className="minimal-spinner" />
          <span className="loading-state-text">Loading editorial decision history...</span>
        </div>
      )}

      {!loading && rejected.length === 0 && (
        <div className="dashboard-empty-card fade-in">
          <div className="empty-icon-wrap">
            <EditorialLogIcon size={22} />
          </div>
          <h2 className="empty-title">No Editorial Rejections Logged Yet</h2>
          <p className="empty-desc">
            As discovery cycles run, candidates that fail the 100-point rubric will be logged with full transparent justifications here.
          </p>
          <button
            className="empty-action-btn"
            onClick={onRunCycle}
            type="button"
          >
            <PlayIcon size={12} style={{ display: "inline-block", marginRight: "6px", verticalAlign: "-1px" }} />
            Trigger Scout Discovery Cycle
          </button>
        </div>
      )}

      {!loading && rejected.length > 0 && filteredList.length === 0 && (
        <div className="dashboard-empty-card fade-in">
          <h2 className="empty-title">No Matching Filtered Topics</h2>
          <p className="empty-desc">
            No rejected items matched &ldquo;{searchQuery}&rdquo; in the selected filter.
          </p>
          <button
            className="empty-action-btn secondary"
            onClick={() => {
              setSelectedFilter("all");
              setSearchQuery("");
            }}
            type="button"
          >
            Clear Active Filters
          </button>
        </div>
      )}

      {!loading && filteredList.length > 0 && (
        <div className="enterprise-table-container fade-in">
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th style={{ width: "16%" }}>Evaluated At</th>
                <th style={{ width: "12%" }}>Status</th>
                <th style={{ width: "32%" }}>Candidate Topic Title</th>
                <th style={{ width: "24%" }}>Specific Critical Justification</th>
                <th style={{ width: "16%" }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item, idx) => (
                <tr key={item.id || idx} className="enterprise-table-row">
                  {/* Timestamp */}
                  <td className="table-col-date">
                    <div className="date-relative">{formatTimeAgo(item.createdAt)}</div>
                    <div className="date-iso">{formatFullDate(item.createdAt)}</div>
                  </td>

                  {/* Status Tag */}
                  <td className="table-col-status">
                    <span className="rejected-pill">
                      <CrossIcon size={11} />
                      <span>Passed On</span>
                    </span>
                  </td>

                  {/* Topic Title */}
                  <td className="table-col-title">
                    <div className="topic-title-bold">{item.title}</div>
                  </td>

                  {/* Critical Justification */}
                  <td className="table-col-reason">
                    <div className="reason-text-block">
                      {presentCriticalJustification(item.reason)}
                    </div>
                  </td>

                  {/* Source */}
                  <td className="table-col-source">
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {item.sourceUrl ? (
                        <SourcePill url={item.sourceUrl} className="compact" />
                      ) : (
                        <span className="source-none">External Ingestion</span>
                      )}
                      
                      <button
                        style={{
                          backgroundColor: "#f59e0b",
                          color: "white",
                          border: "none",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontWeight: 600,
                          fontSize: "11px",
                          cursor: "pointer",
                          width: "fit-content"
                        }}
                        onClick={async (e) => {
                          const btn = e.currentTarget;
                          btn.innerText = "Researching...";
                          btn.disabled = true;
                          try {
                            const res = await fetch("/api/agent/force-queue", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ 
                                title: item.title,
                                url: item.sourceUrl,
                                reason: item.reason
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              btn.innerText = "✓ Queued (Check Feed)";
                              btn.style.backgroundColor = "#10b981";
                            } else {
                              btn.innerText = "Failed";
                              btn.style.backgroundColor = "#ef4444";
                            }
                          } catch (err) {
                            btn.innerText = "Error";
                          }
                        }}
                        title="Force the AI to research this and put it in the Approved Feed"
                        type="button"
                      >
                        Force Queue
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
