import type { Coverage } from "./conflict/types";

/** Counts of articles returned by retrieval — the only sourcing numbers the brief can stand behind. */
export function CoverageCard({ coverage }: { coverage: Coverage }) {
	const { articles, outlets } = coverage;
	const none = articles === 0;

	return (
		<div className="ci-score-card">
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-end",
					marginBottom: "6px",
				}}
			>
				<span
					style={{
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: "11px",
						letterSpacing: "0.1em",
						color: "var(--text-muted)",
						lineHeight: 1.3,
						textTransform: "uppercase",
					}}
				>
					Coverage
					<br />
					retrieved
				</span>
				<span
					style={{
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: "22px",
						fontWeight: 500,
						color: none ? "var(--text-muted)" : "var(--accent-navy)",
						lineHeight: 1,
					}}
				>
					{articles}
				</span>
			</div>
			<p
				style={{
					fontFamily: "'IBM Plex Mono', monospace",
					fontSize: "11px",
					color: "var(--text-muted)",
					lineHeight: 1.45,
					margin: 0,
				}}
			>
				{none
					? "No recent articles were retrieved for this topic. The brief below rests on the model's background knowledge."
					: `${articles} recent ${articles === 1 ? "article" : "articles"} from ${outlets} ${outlets === 1 ? "outlet" : "outlets"}, linked under Recent coverage. Retrieved, not independently verified.`}
			</p>
		</div>
	);
}
