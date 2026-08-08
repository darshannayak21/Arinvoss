"use client";

import React from "react";
import { RejectedTopic } from "@/lib/types";
import { SourcePill } from "./SourcePill";
import { formatTimeAgo, formatFullDate } from "./PostCard";

interface RejectedCardProps {
  item: RejectedTopic;
  index: number;
}

export function RejectedCard({ item, index }: RejectedCardProps) {
  return (
    <article
      className={`rejected-card fade-in stagger-${Math.min(index + 1, 5)}`}
      id={`rejected-${item.id || index}`}
    >
      <div className="rejected-card-header">
        <div className="rejected-badge">
          <span className="rejected-cross">✕</span>
          <span>Passed On</span>
        </div>
        <span className="rejected-timestamp" title={formatFullDate(item.createdAt)}>
          {formatTimeAgo(item.createdAt)}
        </span>
      </div>

      <h3 className="rejected-topic-title">{item.title}</h3>

      <div className="rejected-reason-box">
        <span className="rejected-reason-prefix">Editorial Reason:</span>
        <span className="rejected-reason-text">{item.reason}</span>
      </div>

      {item.sourceUrl && (
        <div className="rejected-source-wrapper">
          <SourcePill url={item.sourceUrl} className="compact" />
        </div>
      )}
    </article>
  );
}
