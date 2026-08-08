"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavProps {
  postCount?: number;
  rejectedCount?: number;
  isCycling?: boolean;
  onRunCycle?: () => Promise<void>;
  onResetData?: () => Promise<void>;
}

export function Nav({
  postCount,
  rejectedCount,
  isCycling = false,
  onRunCycle,
  onResetData,
}: NavProps) {
  const pathname = usePathname();
  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [schedulerActive, setSchedulerActive] = useState<boolean>(false);
  const [togglingScheduler, setTogglingScheduler] = useState<boolean>(false);

  // Poll scheduler state on mount and periodically
  useEffect(() => {
    async function checkScheduler() {
      try {
        const res = await fetch("/api/agent/scheduler");
        if (res.ok) {
          const data = await res.json();
          setSchedulerActive(Boolean(data.running));
        }
      } catch (err) {
        console.error(err);
      }
    }

    checkScheduler();
    const interval = setInterval(checkScheduler, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleScheduler = async () => {
    if (togglingScheduler) return;
    setTogglingScheduler(true);
    try {
      const res = await fetch("/api/agent/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });
      if (res.ok) {
        const data = await res.json();
        setSchedulerActive(Boolean(data.running));
      }
    } catch (err) {
      console.error("[Scheduler] Toggle error:", err);
    } finally {
      setTogglingScheduler(false);
    }
  };

  const handleRunOnce = async () => {
    if (running || isCycling) return;
    setRunning(true);
    setFeedback("Scouting & Evaluating...");
    try {
      if (onRunCycle) {
        await onRunCycle();
      } else {
        const res = await fetch("/api/agent/cycle", { method: "POST" });
        const data = await res.json();
        if (data.published) {
          setFeedback("✓ Post Published!");
        } else if (data.backlogQueued) {
          setFeedback("✓ Queued to Backlog");
        } else {
          setFeedback("○ Scouted (Below Threshold)");
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback("Cycle Failed");
    } finally {
      setTimeout(() => {
        setRunning(false);
        setFeedback(null);
      }, 3000);
    }
  };

  const handleReset = async () => {
    if (resetting || !confirm("Clear all published posts, rejection logs, and backlog?")) return;
    setResetting(true);
    try {
      if (onResetData) {
        await onResetData();
      } else {
        await fetch("/api/agent/reset", { method: "POST" });
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <nav className="global-nav">
      <div className="nav-container">
        <Link href="/" className="nav-brand" title="Aris Voss — AI Research Engineer">
          <span className={`brand-dot ${schedulerActive ? "pulse-green" : "paused"}`} />
          <span className="brand-name">Aris Voss</span>
          <span className={`brand-badge ${schedulerActive ? "active-badge" : "paused-badge"}`}>
            {schedulerActive ? "Live Autonomy" : "Manual Mode"}
          </span>
        </Link>

        <div className="nav-actions">
          <Link
            href="/"
            className={`nav-pill ${pathname === "/" ? "active" : ""}`}
            id="nav-feed"
          >
            Feed
            {typeof postCount === "number" && postCount > 0 && (
              <span className="nav-pill-count">{postCount}</span>
            )}
          </Link>

          <Link
            href="/editorial-log"
            className={`nav-pill ${pathname === "/editorial-log" ? "active" : ""}`}
            id="nav-editorial"
          >
            Editorial Log
            {typeof rejectedCount === "number" && rejectedCount > 0 && (
              <span className="nav-pill-count muted">{rejectedCount}</span>
            )}
          </Link>

          {/* Master Start / Stop Trigger Switch */}
          <button
            className={`nav-autonomy-switch ${schedulerActive ? "active" : "stopped"}`}
            onClick={handleToggleScheduler}
            disabled={togglingScheduler}
            type="button"
            id="autonomy-toggle-switch"
            title={schedulerActive ? "Click to Pause background publishing" : "Click to Start background publishing"}
          >
            <span className="switch-track">
              <span className="switch-thumb" />
            </span>
            <span className="switch-label">
              {togglingScheduler
                ? "Switching..."
                : schedulerActive
                ? "Auto-Publish: ON"
                : "Auto-Publish: OFF"}
            </span>
          </button>

          {/* Manual Run Once Button */}
          <button
            className={`nav-run-btn ${running || isCycling ? "cycling" : ""}`}
            onClick={handleRunOnce}
            disabled={running || isCycling}
            type="button"
            id="run-once-btn"
            title="Execute a single scout & publish cycle on demand"
          >
            <span className={`run-indicator-dot ${running || isCycling ? "pulse" : ""}`} />
            <span className="run-btn-text">
              {feedback || (running || isCycling ? "Scouting..." : "Run Once")}
            </span>
          </button>

          {/* Reset Button */}
          <button
            className="nav-reset-btn"
            onClick={handleReset}
            disabled={resetting}
            type="button"
            title="Clear all posts and reset local store"
            id="nav-reset-btn"
          >
            {resetting ? "..." : "Reset"}
          </button>
        </div>
      </div>
    </nav>
  );
}
