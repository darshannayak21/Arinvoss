"use client";

import React, { useState } from "react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  isScanning?: boolean;
  onRunCycle?: () => Promise<void>;
}

export function EmptyState({
  title = "Aris is reading right now — first post incoming",
  description = "Scanning arXiv, Hacker News, GitHub, and AI research lab dispatches. Posts will publish autonomously as soon as a paper or repository passes the editorial rubric.",
  isScanning = true,
  onRunCycle,
}: EmptyStateProps) {
  const [running, setRunning] = useState(false);
  const [btnText, setBtnText] = useState<string | null>(null);

  const handleClick = async () => {
    if (running || !onRunCycle) return;
    setRunning(true);
    setBtnText("Scouting & Evaluating Live Feeds...");
    try {
      await onRunCycle();
      setBtnText("Cycle complete");
    } catch (err) {
      console.error(err);
      setBtnText("Failed to Run Cycle");
    } finally {
      setTimeout(() => {
        setRunning(false);
        setBtnText(null);
      }, 2500);
    }
  };

  return (
    <div className="calm-empty-state fade-in">
      <div className="empty-indicator-ring">
        <div className="empty-indicator-core" />
      </div>

      <h2 className="empty-title">{title}</h2>
      <p className="empty-description">{description}</p>

      {onRunCycle ? (
        <div className="empty-action-box">
          <button
            className={`empty-run-trigger-btn ${running ? "running" : ""}`}
            onClick={handleClick}
            disabled={running}
            type="button"
          >
            <span className={`trigger-dot ${running ? "pulse" : ""}`} />
            <span>{btnText || (running ? "Scouting..." : "Trigger First Autonomous Cycle")}</span>
          </button>
        </div>
      ) : isScanning ? (
        <div className="empty-scanning-badge">
          <span className="pulse-dot" />
          <span>Active Discovery Cycle Polling</span>
        </div>
      ) : null}
    </div>
  );
}
