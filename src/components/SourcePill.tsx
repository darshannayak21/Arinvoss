"use client";

import React from "react";

interface SourcePillProps {
  url: string;
  className?: string;
}

export function parseSource(url: string): {
  label: string;
  sourceType: "arxiv" | "github" | "hackernews" | "reddit" | "lab" | "web";
  detail?: string;
} {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname;

    if (host.includes("arxiv.org")) {
      const match = path.match(/abs\/(.+?)(?:v\d+)?$/);
      const id = match ? match[1] : path.split("/").pop() || "paper";
      return { label: `arXiv:${id}`, sourceType: "arxiv", detail: "Research Paper" };
    }

    if (host.includes("github.com")) {
      const parts = path.split("/").filter(Boolean);
      const repo = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0] || "repo";
      return { label: `GitHub: ${repo}`, sourceType: "github", detail: "Open Source" };
    }

    if (host.includes("news.ycombinator.com") || host.includes("ycombinator")) {
      return { label: "Hacker News", sourceType: "hackernews", detail: "Community Discussion" };
    }

    if (host.includes("reddit.com")) {
      const match = path.match(/r\/([^/]+)/);
      const sub = match ? `r/${match[1]}` : "Reddit";
      return { label: sub, sourceType: "reddit", detail: "Discussion" };
    }

    if (host.includes("huggingface.co")) {
      return { label: "Hugging Face Blog", sourceType: "lab", detail: "Lab Release" };
    }

    if (host.includes("openai.com")) {
      return { label: "OpenAI Research", sourceType: "lab", detail: "Lab Publication" };
    }

    if (host.includes("anthropic.com")) {
      return { label: "Anthropic Research", sourceType: "lab", detail: "Lab Publication" };
    }

    if (host.includes("deepmind.google") || host.includes("googleblog.com")) {
      return { label: "Google DeepMind", sourceType: "lab", detail: "Lab Publication" };
    }

    if (host.includes("bellingcat.com")) {
      return { label: "Bellingcat Tech", sourceType: "web", detail: "Investigation" };
    }

    const cleanHost = host.replace(/^www\./, "");
    return { label: cleanHost, sourceType: "web" };
  } catch {
    return { label: "Source Link", sourceType: "web" };
  }
}

export function SourcePill({ url, className = "" }: SourcePillProps) {
  const { label, sourceType } = parseSource(url);

  const getBadgeColorClass = () => {
    switch (sourceType) {
      case "arxiv":
        return "pill-arxiv";
      case "github":
        return "pill-github";
      case "hackernews":
        return "pill-hn";
      case "lab":
        return "pill-lab";
      default:
        return "pill-web";
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`source-pill ${getBadgeColorClass()} ${className}`}
      title={`Open ${url}`}
    >
      <span className="source-dot" />
      <span className="source-label">{label}</span>
      <span className="source-arrow">↗</span>
    </a>
  );
}
