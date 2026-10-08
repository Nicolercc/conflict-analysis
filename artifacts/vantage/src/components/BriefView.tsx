import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import type { IntelligenceBrief } from "@workspace/api-client-react";
import { Shell } from "./Notice";
import { EscalationMeter } from "./EscalationMeter";
import { PerspectivesPanel } from "./PerspectivesPanel";
import { EventTimeline } from "./EventTimeline";
import { CasualtyPanel } from "./CasualtyPanel";
import { InteractiveConflictMap } from "./InteractiveConflictMap";
import { ConflictBackground } from "./ConflictBackground";
import { ClaimList, RetrievalSummary, SourceList } from "./Evidence";
import { adaptBrief } from "./conflict/adapter";
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

/** Where a reader can say a brief is wrong. Opens a pre-filled public issue naming the brief. */
function reportUrl(brief: IntelligenceBrief) {
	const title = `Problem with brief: ${brief.headline}`.slice(0, 120);
	const body = [
		`Brief: ${window.location.origin}/brief/${brief.id}`,
		`Generated: ${brief.generatedAt}`,
		"",
		"What is wrong (quote the sentence if you can):",
		"",
		"What the source actually says, with a link if you have one:",
		"",
	].join("\n");
	return `https://github.com/Nicolercc/conflict-analysis/issues/new?labels=brief-report&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/** A finished brief. The page address is its permanent link. */
export function BriefView({ brief: briefData }: { brief: IntelligenceBrief }) {
	const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
	const copyLink = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopyState("copied");
		} catch {
			// Clipboard blocked by the browser: say so, the address bar still holds the link.
			setCopyState("failed");
		}
		window.setTimeout(() => setCopyState("idle"), 3000);
	}, []);

	const titleRef = useRef<HTMLHeadingElement | null>(null);
	useEffect(() => {
		document.title = `${briefData.headline} · Vantage`;
		titleRef.current?.focus();
	}, [briefData.id, briefData.headline]);

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

					<div className="ci-actions">
						<Link href="/" className="ci-actions__btn">
							New search
						</Link>
						<button
							type="button"
							className="ci-actions__btn"
							onClick={copyLink}
							aria-live="polite"
						>
							{copyState === "copied"
								? "Link copied"
								: copyState === "failed"
									? "Copy from the address bar"
									: "Copy link"}
						</button>
						<a
							href={reportUrl(briefData)}
							target="_blank"
							rel="noopener noreferrer"
							className="ci-actions__btn"
						>
							Report a problem
							<span className="sr-only"> (opens GitHub in a new tab)</span>
						</a>
					</div>
				</div>

				<p className="ci-ai-notice">
					<strong>AI-generated brief.</strong> Key facts and the coverage
					comparison cite numbered sources that were retrieved for this brief;
					follow the numbers to the original reporting. Everything else — the
					summary, timeline, perspectives, figures and escalation assessment —
					is the model&apos;s background context and is not individually
					sourced. Check original reporting before you cite it.
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

						<div className="ci-section-block">
							<h2 style={S.sectionTitle}>Key facts from retrieved reporting</h2>
							<ClaimList
								claims={briefData.keyFacts}
								sources={briefData.sources}
								empty="Nothing in the retrieved sources could be tied to a specific claim, so none is shown."
							/>
						</div>

						{(briefData.coverage.agreements.length > 0 ||
							briefData.coverage.differences.length > 0) && (
							<div className="ci-section-block">
								<h2 style={S.sectionTitle}>How coverage compares</h2>
								<div className="ci-compare">
									<div>
										<h3 className="ci-compare__head">Where outlets agree</h3>
										<ClaimList
											claims={briefData.coverage.agreements}
											sources={briefData.sources}
											empty="No shared point was found across the retrieved outlets."
										/>
									</div>
									<div>
										<h3 className="ci-compare__head">Where framing differs</h3>
										<ClaimList
											claims={briefData.coverage.differences}
											sources={briefData.sources}
											empty="No clear difference in framing was found."
										/>
									</div>
								</div>
							</div>
						)}

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

						<div className="ci-section-block">
							<h2 style={S.sectionTitle}>Sources</h2>
							<RetrievalSummary retrieval={briefData.retrieval} />
							<SourceList sources={briefData.sources} />
						</div>
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
					{analysis.credit}. This page is a saved copy: it shows the brief
					exactly as generated and does not update.
				</div>
			</div>
		</div>
		</Shell>
	);
}
