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

/** Numbered links from a claim to the sources that support it. */
function Citations({ ids, sources }: { ids: string[]; sources: Source[] }) {
	return (
		<span className="ci-cites">
			{ids.map((id) => {
				const index = sources.findIndex((s) => s.id === id);
				if (index === -1) return null;
				const source = sources[index];
				return (
					<a
						key={id}
						href={`#${sourceAnchor(id)}`}
						className="ci-cite"
						aria-label={`Source ${index + 1}: ${source.publisher}`}
					>
						{index + 1}
					</a>
				);
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
					{claim.text} <Citations ids={claim.sourceIds} sources={sources} />
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
