"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Post, RejectedTopic } from "@/lib/types";
import { Sidebar, NavTab } from "@/components/Sidebar";
import { ApprovedFeedView } from "@/components/ApprovedFeedView";
import { EditorialLogView } from "@/components/EditorialLogView";
import { PersonaSettingsView } from "@/components/PersonaSettingsView";
import { PostDetailDrawer } from "@/components/PostDetailDrawer";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTab>("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [rejected, setRejected] = useState<RejectedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCycling, setIsCycling] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchDashboardData = useCallback(async (id: string) => {
    try {
      const [feedRes, rejRes] = await Promise.all([
        fetch(`/api/agent/feed?agentId=${id}&t=${Date.now()}`),
        fetch(`/api/agent/rejected?agentId=${id}&t=${Date.now()}`),
      ]);

      if (feedRes.ok) {
        const feedData = await feedRes.json();
        setPosts(feedData.posts || []);
      }

      if (rejRes.ok) {
        const rejData = await rejRes.json();
        setRejected(rejData.rejected || []);
      }
    } catch (err) {
      console.error("[Dashboard] Fetch error:", err);
    }
  }, []);

  const handleRunCycle = async () => {
    if (isCycling) return;
    setIsCycling(true);
    try {
      const res = await fetch("/api/agent/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || "Unable to run the discovery cycle.");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (agentId) {
        await fetchDashboardData(agentId);
      }

      if (data.published) {
        showToast("Published new high-signal AI research dispatch.");
      } else if (data.backlogQueued) {
        showToast("Candidate scored ≥75 and was queued in Backlog.");
      } else {
        showToast(data.discoveryStatus || `Discovery cycle complete. Evaluated ${data.candidatesEvaluated || 0} candidate(s).`);
      }
    } catch (err) {
      console.error("[Cycle] Run failed:", err);
      const message = err instanceof Error ? err.message : "Unknown cycle error";
      showToast(`Cycle run failed: ${message}`);
      throw err;
    } finally {
      setIsCycling(false);
    }
  };

  const handleResetData = async () => {
    try {
      await fetch("/api/agent/reset", { method: "POST" });
      setPosts([]);
      setRejected([]);
      setSelectedPost(null);
      showToast("Database reset. Posts, rejection logs, and seen cache cleared.");
    } catch (err) {
      console.error("[Reset] Error:", err);
    }
  };

  // Initialize agent
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/agent/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona: {
              name: "Arin Voss",
              domain: "AI Research Engineering",
            },
          }),
        });

        if (!res.ok) throw new Error("Agent initialization failed");
        const data = await res.json();
        setAgentId(data.agentId);
        await fetchDashboardData(data.agentId);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [fetchDashboardData]);

  // Periodic polling every 15s
  useEffect(() => {
    if (!agentId) return;
    const interval = setInterval(() => fetchDashboardData(agentId), 15000);
    return () => clearInterval(interval);
  }, [agentId, fetchDashboardData]);

  return (
    <div className="dashboard-app-layout">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        postCount={posts.length}
        rejectedCount={rejected.length}
        isCycling={isCycling}
        onRunCycle={handleRunCycle}
        onResetData={handleResetData}
      />

      {/* Main Content Canvas */}
      <main className="dashboard-main-canvas">
        {/* Dynamic Toast Banner */}
        {toastMessage && (
          <div className="status-toast fade-in">
            <span className="toast-dot" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* View 1: Approved Feed */}
        {activeTab === "feed" && (
          <ApprovedFeedView
            posts={posts}
            loading={loading}
            onSelectPost={setSelectedPost}
            onRunCycle={handleRunCycle}
          />
        )}

        {/* View 2: Editorial Log */}
        {activeTab === "editorial" && (
          <EditorialLogView
            rejected={rejected}
            postCount={posts.length}
            loading={loading}
            onRunCycle={handleRunCycle}
          />
        )}

        {/* View 3: Persona Profile & Settings */}
        {activeTab === "persona" && (
          <PersonaSettingsView
            agentId={agentId}
            postCount={posts.length}
            rejectedCount={rejected.length}
            onRunCycle={handleRunCycle}
            onResetData={handleResetData}
          />
        )}

        {/* Global Footer */}
        <footer className="dashboard-footer">
          <div className="footer-left">
            <span className="footer-brand">Arin Voss Research Engine</span>
            <span className="footer-sep">•</span>
            <span className="footer-mode">VICODATHON 2026 Autonomous Track</span>
          </div>
          <div className="footer-right">
            <span>LLM: Groq / Llama 3.3 70B & 8B</span>
            <span className="footer-sep">•</span>
            <span>Deterministic Mermaid.js AST</span>
          </div>
        </footer>
      </main>

      {/* Slide-Over Detail Drawer */}
      <PostDetailDrawer
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </div>
  );
}
