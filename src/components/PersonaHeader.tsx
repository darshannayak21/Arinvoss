"use client";

import React from "react";

interface PersonaHeaderProps {
  postCount: number;
  agentId?: string | null;
  agentDomain?: string;
  viewMode?: "feed" | "table";
  onViewModeChange?: (mode: "feed" | "table") => void;
  isSchedulerActive?: boolean;
}

export function PersonaHeader({
  postCount,
  agentId,
  agentDomain = "AI Research Engineering",
  viewMode,
  onViewModeChange,
  isSchedulerActive = false,
}: PersonaHeaderProps) {
  return (
    <header className="persona-section">
      <div className="persona-container">
        <div className="persona-avatar-wrap">
          <div className="persona-avatar">AV</div>
          <span
            className={`persona-status-indicator ${isSchedulerActive ? "active" : "paused"}`}
            title={isSchedulerActive ? "Autonomous Engine Active" : "Autonomous Engine Paused"}
          />
        </div>

        <h1 className="persona-headline">Arin Voss</h1>
        <p className="persona-subheading">AI Research Engineer</p>

        <p className="persona-bio">
          &ldquo;I read the papers so you don&apos;t have to, then I check if anyone&apos;s actually shipped it.&rdquo;
        </p>

        <div className="persona-pill-group">
          <div className={`status-pill ${isSchedulerActive ? "live" : "paused"}`}>
            <span className={`status-dot ${isSchedulerActive ? "green" : "amber"}`} />
            <span>{isSchedulerActive ? "Auto-Publish: Active" : "Auto-Publish: Paused"}</span>
          </div>

          <div className="status-pill">
            <span className="pill-strong">{postCount}</span>
            <span>{postCount === 1 ? "Post Published" : "Posts Published"}</span>
          </div>

          <div className="status-pill domain-pill">
            <span>{agentDomain}</span>
          </div>
        </div>

        {onViewModeChange && (
          <div className="view-mode-bar">
            <div className="view-mode-pill-container">
              <button
                className={`view-mode-btn ${viewMode === "feed" ? "active" : ""}`}
                onClick={() => onViewModeChange("feed")}
                id="view-feed-btn"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "-2px" }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                Editorial Feed
              </button>

              <button
                className={`view-mode-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => onViewModeChange("table")}
                id="view-table-btn"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "-2px" }}>
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                Dispatch Archive Table
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
