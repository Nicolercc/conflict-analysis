import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type {
	Claim,
	RetrievalStatus,
	Source,
} from "@workspace/api-client-react";

const sourceAnchor = (id: string) => `source-${id}`;

function formatDate(iso: string | null) {
	if (!iso) return "date not given";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "date not given";
	return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * A citation number. Pressing it shows the source right where the claim is —
 * outlet, date, headline and the publisher's summary — so a reader can check
 * the claim without losing their place. The popover also links to the article
 * and to the entry in the source list.
 */
function Citation({ source, number, quote }: { source: Source; number: number; quote: string }) {
	const [open, setOpen] = useState(false);
	const wrapRef = useRef<HTMLSpanElement | null>(null);
	const popRef = useRef<HTMLSpanElement | null>(null);
	const popId = useId();

	// Close on Escape, and on a press or focus that lands outside.
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			setOpen(false);
			wrapRef.current?.querySelector("button")?.focus();
		};
		const onOutside = (e: Event) => {
			if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("keydown", onKey);
		document.addEventListener("pointerdown", onOutside);
		document.addEventListener("focusin", onOutside);
		return () => {
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("pointerdown", onOutside);
			document.removeEventListener("focusin", onOutside);
		};
	}, [open]);

	// Keep the popover inside the screen: it opens under its number, then is
	// nudged sideways if that would push it past either edge.
	useLayoutEffect(() => {
		const pop = popRef.current;
		if (!open || !pop) return;
		pop.style.setProperty("--shift", "0px");
		const box = pop.getBoundingClientRect();
		const margin = 12;
		const over = box.right - (window.innerWidth - margin);
		const under = margin - box.left;
		pop.style.setProperty("--shift", `${over > 0 ? -over : under > 0 ? under : 0}px`);
	}, [open]);

	return (
		<span className="ci-cite-wrap" ref={wrapRef}>
			<button
				type="button"
				className="ci-cite"
				aria-label={`Source ${number}: ${source.publisher}`}
				aria-expanded={open}
				aria-controls={open ? popId : undefined}
				onClick={() => setOpen((v) => !v)}
			>
				{number}
			</button>
			{open && (
				<span className="ci-cite-pop" id={popId} ref={popRef} role="group" aria-label={`Source ${number}`}>
					<span className="ci-cite-pop__meta">
						<strong>{source.publisher}</strong>
						{source.country ? ` · ${source.country}` : ""}
						{source.kind === "news" ? ` · ${formatDate(source.publishedAt)}` : ""}
						{source.kind !== "news" ? ` · ${KIND_LABEL[source.kind]}` : ""}
					</span>
					{quote ? (
						<span className="ci-cite-pop__quote">
							<span className="ci-cite-pop__quote-label">The words this rests on</span>
							<q>{quote}</q>
						</span>
					) : null}
					<span className="ci-cite-pop__title">{source.title}</span>
					{quote ? null : source.excerpt ? (
						<span className="ci-cite-pop__excerpt">{source.excerpt}</span>
					) : (
						<span className="ci-cite-pop__excerpt ci-cite-pop__excerpt--none">
							{source.kind === "article"
								? "Checked against the text you supplied, which is not stored or shown."
								: "The publisher gave no summary for this item."}
						</span>
					)}
					<span className="ci-cite-pop__links">
						{source.url ? (
							<a href={source.url} target="_blank" rel="noopener noreferrer">
								Read the original
								<span className="sr-only"> (opens in a new tab)</span>
							</a>
						) : null}
						<a
							href={`#${sourceAnchor(source.id)}`}
							onClick={() => setOpen(false)}
						>
							Show in source list
						</a>
					</span>
				</span>
			)}
		</span>
	);
}

/** The numbered sources behind one claim, each with the words quoted from it. */
function Citations({ claim, sources }: { claim: Claim; sources: Source[] }) {
	return (
		<span className="ci-cites">
			{claim.sourceIds.map((id) => {
				const index = sources.findIndex((s) => s.id === id);
				if (index === -1) return null;
				const quote = claim.evidence.find((e) => e.sourceId === id)?.quote ?? "";
				return <Citation key={id} source={sources[index]} number={index + 1} quote={quote} />;
			})}
		</span>
	);
}

export function ClaimList({
	claims,
	sources,
	empty,
}: {
	claims: Claim[];
	sources: Source[];
	empty: string;
}) {
	if (claims.length === 0) {
		return <p className="ci-evidence-empty">{empty}</p>;
	}
	return (
		<ul className="ci-claims">
			{claims.map((claim, i) => (
				<li key={i} className="ci-claim">
					{claim.text} <Citations claim={claim} sources={sources} />
				</li>
			))}
		</ul>
	);
}

const KIND_LABEL: Record<Source["kind"], string> = {
	news: "News",
	reference: "Background reference",
	article: "Supplied by you",
};

export function SourceList({ sources }: { sources: Source[] }) {
	if (sources.length === 0) {
		return (
			<p className="ci-evidence-empty">
				No sources were retrieved for this brief.
			</p>
		);
	}
	return (
		<ol className="ci-sources">
			{sources.map((s) => (
				<li key={s.id} id={sourceAnchor(s.id)} className="ci-source" tabIndex={-1}>
					<p className="ci-source__meta">
						<strong>{s.publisher}</strong>
						{s.country ? ` · ${s.country}` : ""}
						{s.language && s.language !== "English" ? ` · ${s.language}` : ""}
						{s.kind === "news" ? ` · ${formatDate(s.publishedAt)}` : ""}
						{` · ${KIND_LABEL[s.kind]}`}
					</p>
					{s.url ? (
						<a
							href={s.url}
							target="_blank"
							rel="noopener noreferrer"
							className="ci-source__title"
						>
							{s.title}
							<span className="sr-only"> (opens in a new tab)</span>
						</a>
					) : (
						<span className="ci-source__title">{s.title}</span>
					)}
					{s.excerpt ? <p className="ci-source__excerpt">{s.excerpt}</p> : null}
				</li>
			))}
		</ol>
	);
}

/** Which providers answered, in plain words, so missing coverage is visible. */
export function RetrievalSummary({ retrieval }: { retrieval: RetrievalStatus[] }) {
	if (retrieval.length === 0) return null;
	const failed = retrieval.filter((r) => r.status === "failed");
	const used = retrieval.filter((r) => r.count > 0).length;
	return (
		<p className="ci-retrieval">
			Checked {retrieval.length} news feeds and services; {used} had coverage
			used here.
			{failed.length > 0
				? ` Could not reach: ${failed.map((f) => f.provider).join(", ")}.`
				: ""}
		</p>
	);
}
