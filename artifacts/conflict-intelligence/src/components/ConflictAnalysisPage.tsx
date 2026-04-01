import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { useExploreConflict } from "@workspace/api-client-react";
import { SiteHeader } from "./LiveTicker";
import { AnalysisLoader } from "./AnalysisLoader";
import { AnimatedScore } from "./AnimatedScore";
import { EscalationMeter } from "./EscalationMeter";
import { PerspectivesPanel } from "./PerspectivesPanel";
import { EventTimeline } from "./EventTimeline";
import { VerificationPanel } from "./VerificationPanel";
import { CasualtyPanel } from "./CasualtyPanel";
import { WorldMap } from "./WorldMap";
import { SourceDiversity } from "./SourceDiversity";
import { TypewriterSummary } from "./TypewriterSummary";
import { ConflictBackground } from "./ConflictBackground";
import { LiveEventsPanel } from "./LiveEventsPanel";
import { adaptBrief } from "./conflict/adapter";
import type { CSSProperties } from "react";

export function ConflictAnalysisPageRoute() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const topic = params.get("topic") || "";

  const [phase, setPhase] = useState<"idle" | "loading" | "loaded" | "error">(
    topic ? "loading" : "idle"
  );
  const { mutate, data: briefData, error, isPending } = useExploreConflict();

  // Trigger analysis when topic changes
  useEffect(() => {
    if (!topic) {
      setPhase("idle");
      return;
    }

    setPhase("loading");
    mutate({ data: { topic } });
  }, [topic, mutate]);

  // Handle mutation state changes
  useEffect(() => {
    if (isPending) {
      setPhase("loading");
    } else if (briefData) {
      setPhase("loaded");
    } else if (error) {
      setPhase("error");
    }
  }, [isPending, briefData, error]);

  if (!topic) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        <SiteHeader />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 56px)",
            padding: "24px",
          }}
        >
          <p style={{ color: "var(--text-muted)" }}>No topic provided</p>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        <SiteHeader />
        <div style={{ paddingTop: "56px" }}>
          <AnalysisLoader />
        </div>
      </div>
    );
  }

  if (phase === "error" || !briefData) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        <SiteHeader />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 56px)",
            padding: "24px",
          }}
        >
          <div
            style={{
              textAlign: "center" as const,
              maxWidth: "480px",
            }}
          >
            <h2 style={{ color: "var(--text-primary)", marginBottom: "12px" }}>
              Analysis Failed
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
              {error
                ? (error as any)?.message || "Unable to analyze this topic"
                : "No data received"}
            </p>
            <a
              href="/"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                background: "var(--accent, #C2536A)",
                color: "#fff",
                borderRadius: "8px",
                textDecoration: "none",
                fontFamily: "Syne, sans-serif",
                fontSize: "14px",
              }}
            >
              Back to Search
            </a>
          </div>
        </div>
      </div>
    );
  }

  const analysis = adaptBrief(briefData);

  const S: Record<string, CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "var(--bg-primary)",
      paddingTop: "56px",
      paddingBottom: "80px",
    },
    wrap: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "0 24px",
    },
    hero: {
      paddingTop: "40px",
      paddingBottom: "40px",
      borderBottom: "1px solid var(--border-light)",
      marginBottom: "40px",
    },
    title: {
      fontFamily: "Cormorant Garamond, Georgia, serif",
      fontSize: "clamp(28px, 4vw, 42px)",
      lineHeight: 1.1,
      margin: "0 0 12px",
      color: "var(--text-primary)",
    },
    meta: {
      display: "flex",
      gap: "16px",
      alignItems: "center",
      fontSize: "13px",
      color: "var(--text-secondary)",
      marginBottom: "24px",
      flexWrap: "wrap" as const,
    },
    metaItem: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "24px",
      marginBottom: "40px",
    },
    panel: {
      background: "var(--bg-surface)",
      border: "1px solid var(--border-light)",
      borderRadius: "12px",
      padding: "24px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    },
    fullWidth: {
      gridColumn: "1 / -1",
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: 600,
      color: "var(--text-primary)",
      marginBottom: "16px",
      fontFamily: "Syne, sans-serif",
      letterSpacing: "0.5px",
    },
  };

  return (
    <div style={S.page}>
      <SiteHeader onReset={() => (window.location.href = "/")} hasResult />

      <div style={S.wrap}>
        {/* Hero Section */}
        <div style={S.hero}>
          <h1 style={S.title}>{analysis.title}</h1>
          <div style={S.meta}>
            <div style={S.metaItem}>
              📍 {analysis.location}
            </div>
            <div style={S.metaItem}>
              🌍 {analysis.region}
            </div>
          </div>

          {/* Summary */}
          <TypewriterSummary text={analysis.summary} active={true} />
        </div>

        {/* Key Metrics */}
        <div style={S.grid}>
          <div style={{ ...S.panel, ...S.fullWidth }}>
            <h3 style={S.sectionTitle}>Key Indicators</h3>
            <ConflictBackground text={analysis.historicalContext} active={true} />
          </div>
        </div>

        {/* Scores & Status */}
        <div style={S.grid}>
          <div style={S.panel}>
            <AnimatedScore
              score={analysis.credibilityScore}
              label="Credibility"
              reason={analysis.credibilityTag}
              active={true}
            />
          </div>
          <div style={S.panel}>
            <EscalationMeter
              level={analysis.escalationLevel}
              reason={analysis.escalationTag}
              active={true}
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={S.grid}>
          {/* Map */}
          <div style={{ ...S.panel, ...S.fullWidth }}>
            <h3 style={S.sectionTitle}>Geographic Overview</h3>
            <WorldMap data={briefData} active={true} />
          </div>

          {/* Perspectives */}
          <div style={{ ...S.panel, ...S.fullWidth }}>
            <h3 style={S.sectionTitle}>Key Perspectives</h3>
            <PerspectivesPanel perspectives={briefData.perspectives} active={true} />
          </div>

          {/* Timeline */}
          <div style={{ ...S.panel, ...S.fullWidth }}>
            <h3 style={S.sectionTitle}>Timeline of Events</h3>
            <EventTimeline events={briefData.relatedEvents} active={true} />
          </div>

          {/* Verification & Sources */}
          <div style={S.panel}>
            <h3 style={S.sectionTitle}>Source Verification</h3>
            <VerificationPanel
              verification={briefData.verification}
              active={true}
            />
          </div>

          <div style={S.panel}>
            <h3 style={S.sectionTitle}>Source Diversity</h3>
            <SourceDiversity sources={briefData.verification?.sources} />
          </div>

          {/* Casualties */}
          {briefData.casualtyData && (
            <div style={S.panel}>
              <h3 style={S.sectionTitle}>Affected Population</h3>
              <CasualtyPanel data={briefData.casualtyData} active={true} />
            </div>
          )}

          {/* Live Events */}
          {briefData.liveEvents && briefData.liveEvents.length > 0 && (
            <div style={{ ...S.panel, ...S.fullWidth }}>
              <h3 style={S.sectionTitle}>Latest Developments</h3>
              <LiveEventsPanel
                events={briefData.liveEvents}
                active={true}
              />
            </div>
          )}
        </div>

        {/* Key Question */}
        {analysis.keyQuestion && (
          <div
            style={{
              ...S.panel,
              ...S.fullWidth,
              background: "linear-gradient(135deg, #f5f1e8 0%, #f9f7f2 100%)",
              borderLeft: "4px solid var(--accent-navy)",
              marginTop: "40px",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                fontFamily: "DM Mono, monospace",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                margin: "0 0 12px",
              }}
            >
              Critical Question
            </p>
            <p
              style={{
                fontSize: "16px",
                fontFamily: "Syne, sans-serif",
                fontWeight: 500,
                color: "var(--text-primary)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {analysis.keyQuestion}
            </p>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            textAlign: "center" as const,
            paddingTop: "40px",
            paddingBottom: "20px",
            borderTop: "1px solid var(--border-light)",
            marginTop: "60px",
            fontSize: "12px",
            color: "var(--text-muted)",
            fontFamily: "DM Mono, monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {analysis.credit}
        </div>
      </div>
    </div>
  );
}
