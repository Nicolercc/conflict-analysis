import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "wouter";
import type { IntelligenceBrief } from "@workspace/api-client-react";
import { Shell } from "./Notice";
import { PerspectivesPanel } from "./PerspectivesPanel";
import { EventTimeline } from "./EventTimeline";
import { CasualtyPanel } from "./CasualtyPanel";
import { InteractiveConflictMap } from "./InteractiveConflictMap";
import { ConflictBackground } from "./ConflictBackground";
import { ClaimList, RetrievalSummary, SourceList } from "./Evidence";
import { adaptBrief } from "./conflict/adapter";
import { PartiesPanel } from "./PartiesPanel";
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

type Kind = "sourced" | "background" | "retrieved";

const KIND_LABEL: Record<Kind, string> = {
	sourced: "From retrieved reporting",
	background: "Model background",
	retrieved: "Retrieved, not written by the model",
};

const KIND_HELP: Record<Kind, string> = {
	sourced: "Each statement quotes the numbered sources that say it; the quotes are checked against the sources.",
	background: "Written by the model from general knowledge; not individually sourced.",
	retrieved: "Fetched from news feeds, a news search and Wikipedia.",
};

/**
 * One part of the brief. Every section says where its content comes from, so
 * the difference between cited reporting and model background travels with
 * the text and does not depend on a notice the reader may have scrolled past.
 */
function Section({
	id,
	title,
	kind,
	collapsible = false,
	startOpen,
	children,
}: {
	id: string;
	title: string;
	kind: Kind;
	/** Background sections fold away on small screens so the sourced part stays close. */
	collapsible?: boolean;
	startOpen: boolean;
	children: ReactNode;
}) {
	const heading = (
		<>
			<h2 className="ci-section__title">{title}</h2>
			<span className={`ci-kind ci-kind--${kind}`} title={KIND_HELP[kind]}>
				{KIND_LABEL[kind]}
			</span>
		</>
	);
	if (!collapsible) {
		return (
			<section id={id} className="ci-section" aria-labelledby={`${id}-h`} tabIndex={-1}>
				<div className="ci-section__head" id={`${id}-h`}>
					{heading}
				</div>
				{children}
			</section>
		);
	}
	return (
		<section id={id} className="ci-section" tabIndex={-1}>
			<details className="ci-section__details" open={startOpen}>
				<summary className="ci-section__head ci-section__head--toggle">{heading}</summary>
				{children}
			</details>
		</section>
	);
}

/** Jump to a section, opening it first if it is folded away. */
function goToSection(id: string) {
	const section = document.getElementById(id);
	if (!section) return;
	const details = section.querySelector("details");
	if (details) details.open = true;
	const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
	section.focus({ preventScroll: true });
}

/** What stood between the model's draft and the claims on this page, in plain words. */
function checkNote(brief: IntelligenceBrief): string {
	const base =
		"Press a number to see the words each claim rests on. Every quote was matched against its source.";
	const v = brief.verification;
	if (v.status !== "verified") return `${base} A second-model check did not run for this brief.`;
	if (v.checked === 0) return base;
	const outcome = [
		v.corrected > 0 ? `${v.corrected} ${v.corrected === 1 ? "was" : "were"} cut back to what the quote says` : "",
		v.removed > 0 ? `${v.removed} ${v.removed === 1 ? "was" : "were"} removed` : "",
	].filter(Boolean);
	return `${base} A second model then read ${v.checked} ${v.checked === 1 ? "claim" : "claims"} against ${v.checked === 1 ? "its quote" : "their quotes"}; ${outcome.length ? outcome.join(" and ") : "all passed"}.`;
}

const RISK_CLASS = { Low: "low", Medium: "medium", High: "high" } as const;

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

	// Decided once per page: background sections start folded on a phone.
	const [wide] = useState(() => window.matchMedia("(min-width: 721px)").matches);

	const analysis = adaptBrief(briefData);
	const regionBits = analysis.region.split("·").map((s) => s.trim());
	const regionBadge = regionBits[0]?.toUpperCase() ?? "";
	const regionSubtitle =
		regionBits.slice(1).join(" · ").trim() || analysis.location;
	const hasComparison =
		briefData.coverage.agreements.length > 0 || briefData.coverage.differences.length > 0;

	const nav: { id: string; label: string }[] = [
		{ id: "summary", label: "Summary" },
		{ id: "key-facts", label: "Key facts" },
		...(hasComparison ? [{ id: "coverage", label: "Coverage" }] : []),
		{ id: "map", label: "Map" },
		{ id: "assessment", label: "Assessment" },
		{ id: "timeline", label: "Timeline" },
		{ id: "perspectives", label: "Perspectives" },
		...(briefData.casualtyData ? [{ id: "population", label: "Population" }] : []),
		{ id: "context", label: "Context" },
		{ id: "sources", label: `Sources (${briefData.sources.length})` },
	];

	return (
		<Shell status={`Brief ready: ${analysis.title}`}>
			<div className="ci-page">
				<div className="ci-wrap">
					<header className="ci-hero">
						<div className="ci-hero__region-row">
							{regionBadge ? (
								<span className="ci-hero__badge">{regionBadge}</span>
							) : null}
							<span className="ci-hero__locations">{regionSubtitle}</span>
						</div>

						<h1 ref={titleRef} tabIndex={-1} className="ci-hero__title">
							{analysis.title}
						</h1>

						<p className="ci-hero__meta">
							Generated {formatPublishedAt(analysis.publishedAt)}
							<span aria-hidden> · </span>
							{analysis.coverage.articles}{" "}
							{analysis.coverage.articles === 1 ? "article" : "articles"} retrieved
							{analysis.coverage.outlets > 0
								? ` from ${analysis.coverage.outlets} ${analysis.coverage.outlets === 1 ? "outlet" : "outlets"}`
								: ""}
							<span aria-hidden> · </span>
							AI-generated with Claude
						</p>

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
					</header>

					<nav className="ci-nav" aria-label="Sections of this brief">
						<ul className="ci-nav__list">
							{nav.map((item) => (
								<li key={item.id}>
									<a
										href={`#${item.id}`}
										className="ci-nav__link"
										onClick={(e) => {
											e.preventDefault();
											goToSection(item.id);
										}}
									>
										{item.label}
									</a>
								</li>
							))}
						</ul>
					</nav>

					<div className="ci-columns">
						<div className="ci-main">
							<Section id="summary" title="What happened" kind="background" startOpen>
								<p className="ci-summary">{analysis.summary}</p>
							</Section>

							<Section id="key-facts" title="Key facts" kind="sourced" startOpen>
								<p className="ci-section__note">{checkNote(briefData)}</p>
								<ClaimList
									claims={briefData.keyFacts}
									sources={briefData.sources}
									empty="Nothing in the retrieved sources could be tied to a specific claim, so none is shown."
								/>
							</Section>

							{hasComparison && (
								<Section id="coverage" title="How coverage compares" kind="sourced" startOpen>
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
								</Section>
							)}

							<Section id="map" title="Where" kind="background" startOpen>
								<p className="ci-section__note">
									Places are named by the model and drawn only where a map lookup
									confirms them.
								</p>
								<div className="ci-map-outer">
									<InteractiveConflictMap data={briefData} active={true} />
								</div>
							</Section>

							<Section id="assessment" title="Assessment" kind="background" startOpen>
								<p className="ci-assessment">
									<span className="ci-assessment__label">Escalation risk</span>{" "}
									<strong className={`ci-risk ci-risk--${RISK_CLASS[briefData.escalationRisk]}`}>
										{briefData.escalationRisk}
									</strong>
									<span className="ci-assessment__reason"> — {analysis.escalationTag}</span>
								</p>
								{analysis.keyQuestion ? (
									<p className="ci-assessment">
										<span className="ci-assessment__label">Open question</span>{" "}
										<span className="ci-assessment__reason">{analysis.keyQuestion}</span>
									</p>
								) : null}
							</Section>

							<Section id="timeline" title="Background timeline" kind="background" collapsible startOpen={wide}>
								<EventTimeline events={briefData.relatedEvents} active={true} />
							</Section>

							<Section id="perspectives" title="Perspectives" kind="background" collapsible startOpen={wide}>
								<PerspectivesPanel perspectives={briefData.perspectives} active={true} />
							</Section>

							{briefData.casualtyData && (
								<Section id="population" title="Affected population" kind="background" collapsible startOpen={wide}>
									<CasualtyPanel data={briefData.casualtyData} active={true} />
								</Section>
							)}

							<Section id="context" title="Historical context" kind="background" collapsible startOpen={wide}>
								<ConflictBackground text={analysis.historicalContext} active={true} />
							</Section>

							<Section id="sources" title="Sources" kind="retrieved" startOpen>
								<RetrievalSummary retrieval={briefData.retrieval} />
								<SourceList sources={briefData.sources} />
							</Section>
						</div>

						<aside className="ci-sidebar" aria-label="Parties involved">
							<PartiesPanel parties={analysis.parties} active={true} />
						</aside>
					</div>

					<p className="ci-footnote">
						{analysis.credit}. This page is a saved copy: it shows the brief exactly
						as generated and does not update.
					</p>
				</div>
			</div>
		</Shell>
	);
}
