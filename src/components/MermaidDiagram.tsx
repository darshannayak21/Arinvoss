"use client";

import React, { useEffect, useRef, useState } from "react";
import { DiagramIcon } from "./Icons";

interface MermaidDiagramProps {
  chart: string;
  title?: string;
}

/**
 * Pre-processes Mermaid code to ensure node labels with parentheses or special chars
 * are properly quoted so Mermaid parser never throws syntax errors.
 */
function prepareMermaidSource(rawChart: string): string {
  let clean = rawChart.trim().replace(/^```(?:mermaid)?\n?/i, "").replace(/\n?```$/i, "").trim();

  if (!/^(graph|flowchart|sequenceDiagram|classDiagram)\s/i.test(clean)) {
    clean = `graph TD\n${clean}`;
  }

  // Quote unquoted node labels: A[Text (with special chars)] -> A["Text (with special chars)"]
  clean = clean.replace(
    /([A-Za-z0-9_]+)\[([^"\]\n]+)\]/g,
    (match, nodeId, label) => {
      const sanitized = label.trim().replace(/"/g, "'");
      return `${nodeId}["${sanitized}"]`;
    }
  );

  return clean;
}

export function MermaidDiagram({ chart, title = "Architecture Pipeline" }: MermaidDiagramProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<boolean>(false);
  const [showCode, setShowCode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanChart = prepareMermaidSource(chart || "");

  useEffect(() => {
    let isMounted = true;

    async function render() {
      if (!cleanChart || typeof window === "undefined") return;

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            darkMode: true,
            background: "#111114",
            mainBkg: "#18181c",
            nodeBorder: "#38bdf8",
            lineColor: "#94a3b8",
            textColor: "#f8fafc",
            fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif",
            fontSize: "13px",
            primaryColor: "#1e293b",
            primaryBorderColor: "#38bdf8",
            primaryTextColor: "#f8fafc",
            secondaryColor: "#0f172a",
            tertiaryColor: "#090d16",
          },
          securityLevel: "loose",
        });

        // Use unique random container id for Mermaid render
        const renderId = `mermaid_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
        const { svg } = await mermaid.render(renderId, cleanChart);

        if (isMounted) {
          setSvgContent(svg);
          setRenderError(false);
        }
      } catch (err) {
        console.warn("[Mermaid] Render exception:", err);
        if (isMounted) {
          setRenderError(true);
        }
      }
    }

    render();

    return () => {
      isMounted = false;
    };
  }, [cleanChart]);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText?.(cleanChart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!chart) return null;

  return (
    <div className="mermaid-diagram-card fade-in">
      <div className="diagram-header">
        <div className="diagram-title-wrap">
          <DiagramIcon size={15} className="diagram-icon" aria-hidden="true" />
          <span className="diagram-title">{title}</span>
        </div>

        <div className="diagram-actions-wrap">
          <button
            className="diagram-toggle-btn"
            onClick={handleCopyCode}
            type="button"
            title="Copy Mermaid.js source syntax"
          >
            {copied ? "Copied" : "Copy Code"}
          </button>
          <button
            className="diagram-toggle-btn"
            onClick={() => setShowCode(!showCode)}
            type="button"
            title="Toggle between rendered flowchart and raw Mermaid code"
          >
            {showCode ? "Visual View" : "View Syntax"}
          </button>
        </div>
      </div>

      {showCode ? (
        <div className="diagram-code-wrap">
          <pre className="diagram-code-block">
            <code>{cleanChart}</code>
          </pre>
        </div>
      ) : svgContent && !renderError ? (
        <div
          ref={containerRef}
          className="diagram-svg-container"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      ) : (
        /* Fallback visual view when SVG rendering is processing or in fallback mode */
        <div className="diagram-code-wrap">
          <div className="diagram-fallback-badge">
            <span className="fallback-dot" />
            <span>Architecture Flow Spec</span>
          </div>
          <pre className="diagram-code-block">
            <code>{cleanChart}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
