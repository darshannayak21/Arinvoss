"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { CpuIcon, PersonaSettingsIcon, ShieldCheckIcon } from "./Icons";

interface PersonaSettingsViewProps {
  agentId: string | null;
  postCount: number;
  rejectedCount: number;
  onRunCycle: () => Promise<void>;
  onResetData: () => Promise<void>;
}

export function PersonaSettingsView({
  agentId,
  postCount,
  rejectedCount,
  onRunCycle,
  onResetData,
}: PersonaSettingsViewProps) {
  const [schedulerActive, setSchedulerActive] = useState<boolean>(false);
  const [toggling, setToggling] = useState<boolean>(false);
  const [runningCycle, setRunningCycle] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
  }, []);

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
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
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  const handleManualRun = async () => {
    if (runningCycle) return;
    setRunningCycle(true);
    setFeedback("Running full Scout ➔ Writer ➔ Architect ➔ Critic cycle...");
    try {
      await onRunCycle();
      setFeedback("Cycle completed. Feed and editorial log have been refreshed.");
    } catch (err) {
      console.error(err);
      setFeedback(err instanceof Error ? `Cycle failed: ${err.message}` : "Cycle execution failed.");
    } finally {
      setTimeout(() => {
        setRunningCycle(false);
        setFeedback(null);
      }, 3500);
    }
  };

  const handleReset = async () => {
    if (resetting || !confirm("Clear all published posts, rejections, and memory digest?")) return;
    setResetting(true);
    try {
      await onResetData();
      setFeedback("All data reset to clean slate.");
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setResetting(false);
        setFeedback(null);
      }, 3000);
    }
  };

  return (
    <div className="persona-settings-wrapper fade-in">
      {/* Header */}
      <div className="view-top-header">
        <div>
          <h1 className="view-title">Persona Profile & System Architecture</h1>
          <p className="view-subtitle">
            Autonomous agent specifications, editorial guardrails, LLM provider matrix, and memory context engine.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="settings-toast fade-in">
          <span className="toast-dot" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Persona Identity Profile Card */}
        <section className="settings-card persona-hero-card">
          <div className="persona-hero-top">
            <div className="persona-large-avatar">
              <Image
                src="/PFP.png"
                alt="Aris Voss profile portrait"
                width={64}
                height={64}
                priority
              />
            </div>
            <div className="persona-hero-text">
              <div className="persona-title-row">
                <h2 className="persona-hero-name">Aris Voss</h2>
                <span className={`status-pill ${schedulerActive ? "live" : "paused"}`}>
                  <span className={`status-dot ${schedulerActive ? "green" : "amber"}`} />
                  <span>{schedulerActive ? "Live Autonomy" : "Standby Mode"}</span>
                </span>
              </div>
              <p className="persona-hero-role">Senior AI Research Engineer & Systems Architect</p>
              <p className="persona-hero-quote">
                &ldquo;I read the papers so you don&apos;t have to, then I check if anyone&apos;s actually shipped it.&rdquo;
              </p>
            </div>
          </div>

          <div className="persona-specs-grid">
            <div className="spec-tile">
              <span className="spec-tile-label">Core Specialty</span>
              <span className="spec-tile-value">LLMs, Inference Kernels & Neural Architectures</span>
            </div>
            <div className="spec-tile">
              <span className="spec-tile-label">Voice & Persona</span>
              <span className="spec-tile-value">Deeply technical, anti-hype, engineering trade-offs</span>
            </div>
            <div className="spec-tile">
              <span className="spec-tile-label">Agent ID</span>
              <span className="spec-tile-value mono">{agentId || "agent-autonomous-v2"}</span>
            </div>
            <div className="spec-tile">
              <span className="spec-tile-label">Published Dispatches</span>
              <span className="spec-tile-value">{postCount} verified posts</span>
            </div>
          </div>
        </section>

        {/* Editorial Guardrail Rules */}
        <section className="settings-card">
          <div className="card-section-header">
            <ShieldCheckIcon className="card-header-icon" aria-hidden="true" />
            <div>
              <h3 className="card-section-title">Strict Editorial Guardrails (The 6 Laws)</h3>
              <p className="card-section-subtitle">Enforced by the Critic Guardrail Agent before any post is published.</p>
            </div>
          </div>

          <div className="guardrails-list">
            <div className="guardrail-item">
              <div className="guardrail-num">1</div>
              <div className="guardrail-info">
                <span className="guardrail-title">The Punchy Hook</span>
                <span className="guardrail-desc">Must start with a bold 1-sentence observation or question. Never use generic openers like &ldquo;In this paper...&rdquo;</span>
              </div>
            </div>

            <div className="guardrail-item">
              <div className="guardrail-num">2</div>
              <div className="guardrail-info">
                <span className="guardrail-title">Visual Spacing (Anti-Wall of Text)</span>
                <span className="guardrail-desc">Maximum 2 sentences per paragraph block. Double line breaks between every block for 3-second scannability.</span>
              </div>
            </div>

            <div className="guardrail-item">
              <div className="guardrail-num">3</div>
              <div className="guardrail-info">
                <span className="guardrail-title">Clean Bullet Point Line Breaks</span>
                <span className="guardrail-desc">Every bullet point must start on a separate line. Horizontal bullet bundling is rejected automatically.</span>
              </div>
            </div>

            <div className="guardrail-item">
              <div className="guardrail-num">4</div>
              <div className="guardrail-info">
                <span className="guardrail-title">Anti-Hype & Fluff Filter</span>
                <span className="guardrail-desc">Zero tolerance for corporate buzzwords (&ldquo;paradigm shift&rdquo;, &ldquo;game-changer&rdquo;, &ldquo;revolutionary&rdquo;).</span>
              </div>
            </div>

            <div className="guardrail-item">
              <div className="guardrail-num">5</div>
              <div className="guardrail-info">
                <span className="guardrail-title">100% Architecture Diagram Synthesis</span>
                <span className="guardrail-desc">Every post is mapped by a dedicated Architecture Agent into a 6-to-15 node Mermaid.js flow when the research complexity warrants it.</span>
              </div>
            </div>

            <div className="guardrail-item">
              <div className="guardrail-num">6</div>
              <div className="guardrail-info">
                <span className="guardrail-title">Concrete Benchmarks & Source Links</span>
                <span className="guardrail-desc">Must cite real hardware metrics (latency, speedups, parameters) and include primary verified URLs.</span>
              </div>
            </div>
          </div>
        </section>

        {/* LLM & Agent Provider Architecture */}
        <section className="settings-card">
          <div className="card-section-header">
            <CpuIcon className="card-header-icon" aria-hidden="true" />
            <div>
              <h3 className="card-section-title">Multi-Agent Engine & LLM Matrix</h3>
              <p className="card-section-subtitle">Dedicated agents orchestrating discovery, writing, visual synthesis, and auditing.</p>
            </div>
          </div>

          <div className="agents-matrix-grid">
            <div className="agent-matrix-box">
              <div className="matrix-top">
                <span className="matrix-role">Scout Gatekeeper</span>
                <span className="matrix-model">Llama 3.1 8B Instant</span>
              </div>
              <p className="matrix-desc">
                Scores raw research against 4 pillars: AI Relevance (25), Novelty (25), Explanability (30), Credibility (20). Threshold: ≥75.
              </p>
            </div>

            <div className="agent-matrix-box">
              <div className="matrix-top">
                <span className="matrix-role">Writer Agent</span>
                <span className="matrix-model">Llama 3.3 70B Versatile</span>
              </div>
              <p className="matrix-desc">
                Synthesizes research into high-density Aris Voss prose with markdown bolding, concrete metrics, and hook mechanics.
              </p>
            </div>

            <div className="agent-matrix-box">
              <div className="matrix-top">
                <span className="matrix-role">System Architect</span>
                <span className="matrix-model">Llama 3.3 70B + Mermaid</span>
              </div>
              <p className="matrix-desc">
                Independently maps paper abstractions and README evidence into structured, auto-quoted Mermaid.js architecture pipelines.
              </p>
            </div>

            <div className="agent-matrix-box">
              <div className="matrix-top">
                <span className="matrix-role">Critic Guardrail</span>
                <span className="matrix-model">Automated Auditor</span>
              </div>
              <p className="matrix-desc">
                Verifies markdown whitespace, diagram validity, source link inclusion, and strips raw syntax from text blocks.
              </p>
            </div>
          </div>
        </section>

        {/* System Diagnostics & Manual Overrides */}
        <section className="settings-card">
          <div className="card-section-header">
            <PersonaSettingsIcon className="card-header-icon" aria-hidden="true" />
            <div>
              <h3 className="card-section-title">System Diagnostics & Overrides</h3>
              <p className="card-section-subtitle">Direct controls for autonomous discovery cadence and persistence management.</p>
            </div>
          </div>

          <div className="overrides-content">
            <div className="override-row">
              <div className="override-info">
                <span className="override-name">Autonomous 24/7 Background Scheduler</span>
                <span className="override-sub">
                  When enabled, runs a research cycle every 8 hours: three autonomous passes per day.
                </span>
              </div>
              <button
                className={`apple-toggle-switch ${schedulerActive ? "on" : "off"}`}
                onClick={handleToggle}
                disabled={toggling}
                type="button"
                role="switch"
                aria-checked={schedulerActive}
              >
                <span className="switch-slider" />
              </button>
            </div>

            <div className="override-row">
              <div className="override-info">
                <span className="override-name">On-Demand Single Scout Cycle</span>
                <span className="override-sub">
                  Execute one immediate pass across all live sources without waiting for the timer.
                </span>
              </div>
              <button
                className={`btn-settings-action ${runningCycle ? "busy" : ""}`}
                onClick={handleManualRun}
                disabled={runningCycle}
                type="button"
              >
                {runningCycle ? "Executing..." : "Run Once"}
              </button>
            </div>

            <div className="override-row danger-border">
              <div className="override-info">
                <span className="override-name text-danger">Reset Persistent Database</span>
                <span className="override-sub">
                  Clears all published posts, rejected topic logs, and seen URL deduplication hashes.
                </span>
              </div>
              <button
                className="btn-settings-danger"
                onClick={handleReset}
                disabled={resetting}
                type="button"
              >
                {resetting ? "Clearing..." : "Reset Data"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
