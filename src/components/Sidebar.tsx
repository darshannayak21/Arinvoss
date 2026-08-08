"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  FeedIcon,
  EditorialLogIcon,
  PersonaSettingsIcon,
  PlayIcon,
  CheckIcon,
} from "./Icons";

export type NavTab = "feed" | "editorial" | "persona";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  postCount: number;
  rejectedCount: number;
  isCycling: boolean;
  onRunCycle: () => Promise<void>;
  onResetData: () => Promise<void>;
}

export function Sidebar({
  activeTab,
  onTabChange,
  postCount,
  rejectedCount,
  isCycling,
  onRunCycle,
  onResetData,
}: SidebarProps) {
  const [schedulerActive, setSchedulerActive] = useState<boolean>(false);
  const [togglingScheduler, setTogglingScheduler] = useState<boolean>(false);
  const [runningManual, setRunningManual] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Poll scheduler state
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
    if (runningManual || isCycling) return;
    setRunningManual(true);
    setStatusFeedback("Evaluating...");
    try {
      await onRunCycle();
      setStatusFeedback("Cycle Finished");
    } catch (err) {
      console.error(err);
      setStatusFeedback("Cycle Failed");
    } finally {
      setTimeout(() => {
        setRunningManual(false);
        setStatusFeedback(null);
      }, 3500);
    }
  };

  const handleReset = async () => {
    if (resetting || !confirm("Clear all published posts, rejection logs, and seen cache?")) return;
    setResetting(true);
    try {
      await onResetData();
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <aside className="dashboard-sidebar">
      {/* Top: Active Persona Identity Badge with Photo Avatar */}
      <div className="sidebar-persona-card" onClick={() => onTabChange("persona")} role="button" tabIndex={0}>
        <div className="persona-avatar-container">
          <div className="persona-avatar-image-wrap">
            <Image
              src="/PFP.png"
              alt="Aris Voss AI Research Engineer"
              width={38}
              height={38}
              className="persona-avatar-img"
              priority
            />
          </div>
          <span
            className={`persona-pulse-dot ${schedulerActive ? "status-active" : "status-paused"}`}
            title={schedulerActive ? "Autonomous Engine Active (Polling)" : "Autonomous Engine Paused (Manual)"}
          />
        </div>
        <div className="persona-meta">
          <div className="persona-name-row">
            <span className="persona-name">Aris Voss</span>
            <span className={`persona-mode-pill ${schedulerActive ? "live" : "manual"}`}>
              {schedulerActive ? "Live" : "Standby"}
            </span>
          </div>
          <span className="persona-role">AI Systems Engineer</span>
        </div>
      </div>

      {/* Main Navigation Items (Icon-Driven) */}
      <nav className="sidebar-nav" aria-label="Dashboard Navigation">
        <div className="sidebar-nav-section-title">Navigation</div>

        <button
          className={`sidebar-nav-item ${activeTab === "feed" ? "active" : ""}`}
          onClick={() => onTabChange("feed")}
          type="button"
          id="nav-tab-feed"
        >
          <FeedIcon size={16} className="nav-item-svg" />
          <span className="nav-item-label">Approved Feed</span>
          {postCount > 0 && <span className="nav-item-badge">{postCount}</span>}
        </button>

        <button
          className={`sidebar-nav-item ${activeTab === "editorial" ? "active" : ""}`}
          onClick={() => onTabChange("editorial")}
          type="button"
          id="nav-tab-editorial"
        >
          <EditorialLogIcon size={16} className="nav-item-svg" />
          <span className="nav-item-label">Editorial Log</span>
          {rejectedCount > 0 && <span className="nav-item-badge muted">{rejectedCount}</span>}
        </button>

        <button
          className={`sidebar-nav-item ${activeTab === "persona" ? "active" : ""}`}
          onClick={() => onTabChange("persona")}
          type="button"
          id="nav-tab-persona"
        >
          <PersonaSettingsIcon size={16} className="nav-item-svg" />
          <span className="nav-item-label">Persona & Controls</span>
        </button>
      </nav>

      {/* Mid Status Info: System Health */}
      <div className="sidebar-status-card">
        <div className="sidebar-status-header">
          <span className="status-caption">Engine State</span>
          <span className={`status-indicator-text ${schedulerActive ? "text-emerald" : "text-amber"}`}>
            {schedulerActive ? "Autonomous Polling" : "Manual Standby"}
          </span>
        </div>
        <div className="sidebar-status-metrics">
          <div className="metric-mini">
            <span className="metric-mini-label">Published</span>
            <span className="metric-mini-val">{postCount}</span>
          </div>
          <div className="metric-mini-divider" />
          <div className="metric-mini">
            <span className="metric-mini-label">Filtered Out</span>
            <span className="metric-mini-val">{rejectedCount}</span>
          </div>
        </div>
      </div>

      {/* Bottom Sidebar Footer: System Controls */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-title">Engine Controls</div>

        {/* Master Auto-Publish Toggle */}
        <div className="sidebar-control-row">
          <div className="control-label-wrap">
            <span className="control-label-main">Auto-Publish</span>
            <span className="control-label-sub">{schedulerActive ? "3 times daily" : "Paused"}</span>
          </div>

          <button
            className={`apple-toggle-switch ${schedulerActive ? "on" : "off"}`}
            onClick={handleToggleScheduler}
            disabled={togglingScheduler}
            type="button"
            role="switch"
            aria-checked={schedulerActive}
            title={schedulerActive ? "Pause background polling" : "Enable background polling"}
          >
            <span className="switch-slider" />
          </button>
        </div>

        {/* Run Once Execution Button */}
        <button
          className={`sidebar-action-btn run-once-btn ${runningManual || isCycling ? "busy" : ""}`}
          onClick={handleRunOnce}
          disabled={runningManual || isCycling}
          type="button"
          id="sidebar-run-once-btn"
        >
          {runningManual || isCycling ? (
            <span className="btn-dot pulse-dot" />
          ) : statusFeedback ? (
            <CheckIcon size={13} />
          ) : (
            <PlayIcon size={11} />
          )}
          <span>{statusFeedback || (runningManual || isCycling ? "Evaluating..." : "Run Once")}</span>
        </button>

        {/* Reset Database Button */}
        <button
          className="sidebar-reset-btn"
          onClick={handleReset}
          disabled={resetting}
          type="button"
          id="sidebar-reset-btn"
          title="Clear all published posts, rejections, and deduplication cache"
        >
          {resetting ? "Resetting..." : "Reset Database"}
        </button>
      </div>
    </aside>
  );
}
