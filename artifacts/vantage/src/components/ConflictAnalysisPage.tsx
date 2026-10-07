import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
	useAnalyzeArticle,
	useExploreConflict,
	type IntelligenceBrief,
} from "@workspace/api-client-react";
import { briefPath, parseBriefRequest } from "@/lib/brief-request";
import { SiteHeader } from "./LiveTicker";
import { AnalysisLoader } from "./AnalysisLoader";
import { EscalationMeter } from "./EscalationMeter";
import { PerspectivesPanel } from "./PerspectivesPanel";
import { EventTimeline } from "./EventTimeline";
import { CasualtyPanel } from "./CasualtyPanel";
import { InteractiveConflictMap } from "./InteractiveConflictMap";
import { ConflictBackground } from "./ConflictBackground";
import { LiveEventsPanel } from "./LiveEventsPanel";
import { adaptBrief } from "./conflict/adapter";
import type { CSSProperties } from "react";
import { PartiesPanel } from "./PartiesPanel";
import { CoverageCard } from "./CoverageCard";
import "./ConflictAnalysisPageLayout.css";

function formatPublishedAt(iso: string) {
	try {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return "date unavailable";
		return d.toLocaleString(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		});
	} catch {
		return iso;
	}
}

/** The server's own wording when it sent one; otherwise a plain fallback. */
function errorMessage(error: unknown): string {
	const data = (error as { data?: { message?: unknown } } | null)?.data;
	if (data && typeof data.message === "string" && data.message) {
		return data.message;
	}
	return "We couldn't generate this brief. Please try again.";
}

function isOutOfScopeBrief(data: IntelligenceBrief): boolean {
	return data.inScope === false;
}

const SUGGESTED_TOPICS = [
	"Gaza ceasefire reporting",
	"Red Sea shipping tensions",
	"Sudan humanitarian access",
	"Ukraine front-line updates",
];

/** Shared frame: header, a live status line for assistive tech, and the main landmark. */
function Shell({ status, children }: { status: string; children: ReactNode }) {
	return (
		<div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
			<SiteHeader />
			<div role="status" className="sr-only">
				{status}
			</div>
			<main>{children}</main>
		</div>
	);
}

function Notice({
	eyebrow,
	title,
	children,
}: {
	eyebrow: string;
	title: string;
	children: ReactNode;
}) {
	const headingRef = useRef<HTMLHeadingElement | null>(null);
	useEffect(() => {
		headingRef.current?.focus();
	}, [title]);

	return (
		<div className="ci-notice">
			<p className="ci-notice__eyebrow">{eyebrow}</p>
			<h1 ref={headingRef} tabIndex={-1} className="ci-notice__title">
				{title}
			</h1>
			{children}
		</div>
	);
}

export function ConflictAnalysisPageRoute() {
	const search = useSearch();
	const [, navigate] = useLocation();
	const request = useMemo(() => parseBriefRequest(search), [search]);

	const explore = useExploreConflict();
	const analyze = useAnalyzeArticle();
	const active = request?.kind === "topic" ? explore : analyze;
	const { mutate: runExplore } = explore;
	const { mutate: runAnalyze } = analyze;

	const run = useCallback(() => {
		if (!request) return;
		if (request.kind === "topic") {
			runExplore({ data: { topic: request.topic } });
		} else if (request.kind === "url") {
			runAnalyze({ data: { url: request.url } });
		} else {
			runAnalyze({ data: { article: request.text } });
		}
	}, [request, runExplore, runAnalyze]);

	useEffect(() => {
		run();
	}, [run]);

	const briefData = active.data;
	const phase: "empty" | "loading" | "error" | "loaded" = !request
		? "empty"
		: active.isPending || active.isIdle
			? "loading"
			: active.error || !briefData
				? "error"
				: "loaded";

	const titleRef = useRef<HTMLHeadingElement | null>(null);
	useEffect(() => {
		document.title =
			phase === "loaded" && briefData
				? `${isOutOfScopeBrief(briefData) ? "Outside scope" : briefData.headline} · Vantage`
				: phase === "loading"
					? "Generating brief · Vantage"
					: "Vantage";
		if (phase === "loaded") titleRef.current?.focus();
	}, [phase, briefData]);

	if (phase === "empty") {
		return (
			<Shell status="Nothing to brief.">
				<Notice eyebrow="Nothing to brief" title="Start with a topic, a link or an article">
					<p className="ci-notice__text">
						This page needs something to brief. Pasted article text is kept only
						in the tab it was pasted into, so it is not available after the tab
						is closed or the link is shared.
					</p>
					<Link href="/" className="ci-notice__primary">
						Back to search
					</Link>
				</Notice>
			</Shell>
		);
	}

	if (phase === "loading") {
		return (
			<Shell status="Generating your brief.">
				<div style={{ paddingTop: "56px" }}>
					<AnalysisLoader />
				</div>
			</Shell>
		);
	}

	if (phase === "error" || !briefData) {
		const message = errorMessage(active.error);
		return (
			<Shell status={`The brief could not be generated. ${message}`}>
				<Notice eyebrow="Brief not generated" title="We couldn't generate this brief">
					<p className="ci-notice__text">{message}</p>
					<div className="ci-notice__actions">
						<button type="button" className="ci-notice__primary" onClick={run}>
							Try again
						</button>
						<Link href="/" className="ci-notice__secondary">
							Change the search
						</Link>
					</div>
				</Notice>
			</Shell>
		);
	}

	if (isOutOfScopeBrief(briefData)) {
		return (
			<Shell status="This is outside what Vantage briefs.">
				<Notice eyebrow="Outside scope" title="We couldn't find a conflict to brief">
					<p className="ci-notice__text">
						Vantage covers geopolitical conflicts, humanitarian crises and
						regional tensions. Try one of these:
					</p>
					<div className="ci-notice__actions">
						{SUGGESTED_TOPICS.map((topic) => (
							<button
								key={topic}
								type="button"
								className="ci-notice__chip"
								onClick={() => navigate(briefPath({ kind: "topic", topic }))}
							>
								{topic}
							</button>
						))}
					</div>
					<Link href="/" className="ci-notice__secondary">
						Change the search
					</Link>
				</Notice>
			</Shell>
		);
	}

	const analysis = adaptBrief(briefData);
	const regionBits = analysis.region.split("·").map((s) => s.trim());
	const regionBadge = regionBits[0]?.toUpperCase() ?? "";
	const regionSubtitle =
		regionBits.slice(1).join(" · ").trim() || analysis.location;

	const S: Record<string, CSSProperties> = {
		page: {
			paddingTop: "56px",
			paddingBottom: "48px",
		},
		wrap: {
			maxWidth: "1200px",
			margin: "0 auto",
			padding: "0 18px",
		},
		title: {
			fontFamily: "'Newsreader', Georgia, serif",
			fontStyle: "italic",
			fontSize: "clamp(1.3rem, 2.8vw, 2.1rem)",
			fontWeight: 400,
			lineHeight: 1.22,
			margin: "0 0 9px",
			color: "var(--text-primary)",
			outline: "none",
		},
		metaRow: {
			display: "flex",
			alignItems: "center",
			gap: "12px",
			flexWrap: "wrap",
			paddingBottom: "14px",
			borderBottom: "1px solid var(--border-light)",
			fontFamily: "'IBM Plex Mono', monospace",
			fontSize: "11px",
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
			fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
			margin: "0 0 12px",
		},
	};

	return (
		<Shell status={`Brief ready: ${analysis.title}`}>
		<div style={S.page}>
			<div style={S.wrap}>
				<div style={{ paddingTop: "8px" }}>
					<div className="ci-hero__top">
						<div className="ci-hero__region-row">
							{regionBadge ? (
								<span className="ci-hero__badge">{regionBadge}</span>
							) : null}
							<span className="ci-hero__locations">{regionSubtitle}</span>
						</div>
					</div>

					<h1 ref={titleRef} tabIndex={-1} style={S.title}>
						{analysis.title}
					</h1>

					<div style={S.metaRow}>
						<span>Generated {formatPublishedAt(analysis.publishedAt)}</span>
						<span style={{ color: "var(--border-medium)" }}>·</span>
						<span>
							{analysis.coverage.articles}{" "}
							{analysis.coverage.articles === 1 ? "article" : "articles"} retrieved
						</span>
						<span style={{ color: "var(--border-medium)" }}>·</span>
						<span>{analysis.credit}</span>
					</div>
				</div>

				<p className="ci-ai-notice">
					<strong>AI-generated brief.</strong> Articles under Recent coverage
					were retrieved from news sources and link to the originals. Everything
					else — the summary, timeline, perspectives, figures and escalation
					assessment — comes from the model&apos;s background knowledge and is
					not individually sourced. Check original reporting before you cite it.
				</p>

				<div className="ci-score-row">
					<EscalationMeter
						level={analysis.escalationLevel}
						reason={analysis.escalationTag}
						active={true}
					/>
					<CoverageCard coverage={analysis.coverage} />
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
							<h2 style={S.sectionTitle}>What happened</h2>
							<p className="ci-summary">{analysis.summary}</p>
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
										fontFamily: "'Newsreader', Georgia, serif",
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
							<h2 style={S.sectionTitle}>Background timeline</h2>
							<EventTimeline events={briefData.relatedEvents} active={true} />
						</div>

						<div className="ci-section-block">
							<h2 style={S.sectionTitle}>Perspectives</h2>
							<PerspectivesPanel
								perspectives={briefData.perspectives}
								active={true}
							/>
						</div>

						{briefData.casualtyData && (
							<div className="ci-section-block">
								<h2 style={S.sectionTitle}>Affected population</h2>
								<CasualtyPanel data={briefData.casualtyData} active={true} />
							</div>
						)}

						{briefData.liveEvents && briefData.liveEvents.length > 0 && (
							<div className="ci-section-block">
								<h2 style={S.sectionTitle}>Recent coverage</h2>
								<LiveEventsPanel events={briefData.liveEvents} active={true} />
							</div>
						)}
					</div>

					<aside className="ci-sidebar">
						<PartiesPanel parties={analysis.parties} active={true} />
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
		</Shell>
	);
}
