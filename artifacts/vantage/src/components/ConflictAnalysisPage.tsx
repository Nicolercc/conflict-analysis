import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { useExploreConflict } from "@workspace/api-client-react";
import { SiteHeader } from "./LiveTicker";
import { AnalysisLoader } from "./AnalysisLoader";
import { AnimatedScore } from "./AnimatedScore";
import { EscalationMeter } from "./EscalationMeter";
import { PerspectivesPanel } from "./PerspectivesPanel";
import { EventTimeline } from "./EventTimeline";
import { CasualtyPanel } from "./CasualtyPanel";
import { InteractiveConflictMap } from "./InteractiveConflictMap";
import { SourceDiversity } from "./SourceDiversity";
import { TypewriterSummary } from "./TypewriterSummary";
import { ConflictBackground } from "./ConflictBackground";
import { LiveEventsPanel } from "./LiveEventsPanel";
import { adaptBrief } from "./conflict/adapter";
import type { CSSProperties } from "react";
import { ConsensusBlocks } from "./ConsensusBlocks";
import { PartiesPanel } from "./PartiesPanel";
import { SourcesSidebar } from "./SourcesSidebar";
import { DisplacedMetric } from "./DisplacedMetric";
import "./ConflictAnalysisPageLayout.css";

function formatPublishedAt(iso: string) {
	try {
		return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
	} catch {
		return iso;
	}
}

export function ConflictAnalysisPageRoute() {
	const search = useSearch();
	const params = new URLSearchParams(search);
	const topic = params.get("topic") || "";

	const [phase, setPhase] = useState<"idle" | "loading" | "loaded" | "error">(
		topic ? "loading" : "idle",
	);
	const { mutate, data: briefData, error, isPending } = useExploreConflict();

	useEffect(() => {
		if (!topic) {
			setPhase("idle");
			return;
		}

		setPhase("loading");
		mutate({ data: { topic } });
	}, [topic, mutate]);

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
	const sourceCount = analysis.sources.length;
	const regionBits = analysis.region.split("·").map((s) => s.trim());
	const regionBadge = regionBits[0]?.toUpperCase() ?? "";
	const regionSubtitle =
		regionBits.slice(1).join(" · ").trim() || analysis.location;

	const S: Record<string, CSSProperties> = {
		page: {
			minHeight: "100vh",
			background: "var(--bg-primary)",
			paddingTop: "56px",
			paddingBottom: "48px",
		},
		wrap: {
			maxWidth: "1200px",
			margin: "0 auto",
			padding: "0 18px",
		},
		title: {
			fontFamily: "Georgia, 'Cormorant Garamond', serif",
			fontStyle: "italic",
			fontSize: "clamp(1.3rem, 2.8vw, 2.1rem)",
			fontWeight: 400,
			lineHeight: 1.22,
			margin: "0 0 9px",
			color: "var(--text-primary)",
		},
		metaRow: {
			display: "flex",
			alignItems: "center",
			gap: "12px",
			flexWrap: "wrap",
			paddingBottom: "14px",
			borderBottom: "1px solid var(--border-light)",
			fontFamily: "'IBM Plex Mono', monospace",
			fontSize: "10px",
			color: "var(--text-muted)",
		},
		panel: {
			background: "var(--bg-surface)",
			border: "1px solid var(--border-light)",
			borderRadius: "12px",
			padding: "24px",
			boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
		},
		sectionTitle: {
			fontSize: "16px",
			fontWeight: 600,
			color: "var(--text-primary)",
			marginBottom: "12px",
			fontFamily: "Syne, sans-serif",
			letterSpacing: "0.5px",
		},
	};

	return (
		<div style={S.page}>
			<SiteHeader onReset={() => (window.location.href = "/")} />

			<div style={S.wrap}>
				<div style={{ paddingTop: "8px" }}>
					<div className="ci-hero__top">
						<div className="ci-hero__region-row">
							{regionBadge ? (
								<span className="ci-hero__badge">{regionBadge}</span>
							) : null}
							<span className="ci-hero__locations">{regionSubtitle}</span>
						</div>
						<div className="ci-hero__live">
							<span className="ci-hero__live-dot" aria-hidden />
							<span
								style={{
									fontFamily: "'IBM Plex Mono', monospace",
									fontSize: "9px",
									letterSpacing: "0.1em",
									color: "var(--risk-high)",
								}}
							>
								LIVE
							</span>
						</div>
					</div>

					<h1 style={S.title}>{analysis.title}</h1>

					<div style={S.metaRow}>
						<span>{formatPublishedAt(analysis.publishedAt)}</span>
						<span style={{ color: "var(--border-medium)" }}>·</span>
						<span>
							{sourceCount} sources verified
						</span>
						<span style={{ color: "var(--border-medium)" }}>·</span>
						<span>{analysis.credit}</span>
					</div>
				</div>

				<div className="ci-score-row">
					<AnimatedScore
						score={analysis.credibilityScore}
						label="Credibility"
						reason={analysis.credibilityTag}
						active={true}
					/>
					<EscalationMeter
						level={analysis.escalationLevel}
						reason={analysis.escalationTag}
						active={true}
					/>
					<DisplacedMetric
						countLabel={analysis.displacedCount}
						countriesCount={analysis.displacedCountries}
						narrative={analysis.displacedNarrative}
						active={true}
					/>
				</div>
			</div>

			<div style={S.wrap}>
				<div className="ci-map-outer">
					<InteractiveConflictMap data={briefData} active={true} />
				</div>
			</div>

			<div style={S.wrap}>
				<div className="ci-columns">
					<div className="ci-main">
						<div className="ci-section-block">
							<h3 style={S.sectionTitle}>What happened</h3>
							<TypewriterSummary text={analysis.summary} active={true} />
						</div>

						{analysis.keyQuestion && (
							<div
								className="ci-section-block"
								style={{
									...S.panel,
									borderLeft: "3px solid var(--risk-high)",
									marginBottom: "22px",
								}}
							>
								<p
									style={{
										fontSize: "11px",
										fontFamily: "'IBM Plex Mono', monospace",
										letterSpacing: "0.12em",
										textTransform: "uppercase",
										color: "var(--risk-high)",
										margin: "0 0 8px",
									}}
								>
									Key question
								</p>
								<p
									style={{
										fontFamily: "Georgia, serif",
										fontStyle: "italic",
										fontSize: "14px",
										color: "var(--text-secondary)",
										margin: 0,
										lineHeight: 1.6,
									}}
								>
									{analysis.keyQuestion}
								</p>
							</div>
						)}

						<div className="ci-section-block">
							<h3 style={S.sectionTitle}>Timeline of events</h3>
							<EventTimeline events={briefData.relatedEvents} active={true} />
						</div>

						<div className="ci-section-block">
							<PerspectivesPanel
								perspectives={briefData.perspectives}
								active={true}
							/>
						</div>

						<div className="ci-section-block">
							<ConsensusBlocks
								verification={briefData.verification}
								active={true}
							/>
						</div>

						{briefData.casualtyData && (
							<div className="ci-section-block">
								<h3 style={S.sectionTitle}>Affected population</h3>
								<CasualtyPanel data={briefData.casualtyData} active={true} />
							</div>
						)}

						{briefData.liveEvents && briefData.liveEvents.length > 0 && (
							<div className="ci-section-block">
								<h3 style={S.sectionTitle}>Latest developments</h3>
								<LiveEventsPanel events={briefData.liveEvents} active={true} />
							</div>
						)}
					</div>

					<aside className="ci-sidebar">
						<PartiesPanel parties={analysis.parties} active={true} />
						<SourcesSidebar sources={briefData.verification?.sources} active={true} />
						<div>
							<SourceDiversity sources={briefData.verification?.sources} />
						</div>
						<div>
							<span className="section-label">Historical context</span>
							<ConflictBackground
								text={analysis.historicalContext}
								active={true}
							/>
						</div>
					</aside>
				</div>

				<div
					style={{
						borderTop: "1px solid var(--border-light)",
						padding: "11px 0",
						marginTop: "12px",
						fontSize: "12px",
						color: "var(--text-muted)",
						fontFamily: "'IBM Plex Mono', monospace",
						letterSpacing: "0.06em",
					}}
				>
					{analysis.credit}
				</div>
			</div>
		</div>
	);
}
