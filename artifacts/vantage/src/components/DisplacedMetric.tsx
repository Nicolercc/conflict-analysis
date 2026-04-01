import { useEffect, useState } from "react";

function hasStructuredDisplaced(countLabel: string, countriesCount: number) {
	if (countriesCount > 0) return true;
	const t = countLabel.trim();
	if (!t || t === "—" || t === "–" || t === "-") return false;
	const digits = t.replace(/\D/g, "");
	if (!digits) return false;
	return parseInt(digits, 10) > 0;
}

export function DisplacedMetric({
	countLabel,
	countriesCount,
	narrative,
	active,
}: {
	countLabel: string;
	countriesCount: number;
	/** Briefing text when API does not provide a headcount (affectedPopulation / civilianImpact). */
	narrative: string;
	active: boolean;
}) {
	const [animate, setAnimate] = useState(false);

	useEffect(() => {
		if (active) setTimeout(() => setAnimate(true), 200);
		else setAnimate(false);
	}, [active]);

	const structured = hasStructuredDisplaced(countLabel, countriesCount);
	const narrativeTrim = narrative.trim();
	const hasNarrative = narrativeTrim.length > 0;

	const digits = countLabel.replace(/\D/g, "");
	const parsed = digits ? parseInt(digits, 10) : NaN;
	const barPct = structured
		? Math.min(
				100,
				countriesCount > 0
					? countriesCount * 12
					: Number.isFinite(parsed) && parsed > 0
						? Math.min(100, (Math.log10(parsed + 1) / 6) * 100)
						: 0,
			)
		: hasNarrative
			? Math.min(88, 34 + Math.min(narrativeTrim.length / 20, 54))
			: 20;

	const footerLine = structured
		? `${countLabel} · ${countriesCount} ${countriesCount === 1 ? "country" : "countries"}`
		: hasNarrative
			? "Narrative from briefing · hover card for full text"
			: "No headcount in briefing · see Casualties & civilian impact below";

	const heroLabel = structured ? countLabel : hasNarrative ? "Context" : "N/A";

	const bodyText = hasNarrative
		? narrativeTrim
		: "This briefing did not include a consolidated displacement figure. Use the casualty section for civilian-impact detail when available.";

	const showNarrativeBlock = !structured;

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
						fontSize: "8px",
						letterSpacing: "0.1em",
						color: "var(--text-muted)",
						lineHeight: 1.3,
						textTransform: "uppercase",
					}}
				>
					Displaced
					<br />
					civilians
				</span>
				<span
					style={{
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: structured ? "22px" : "17px",
						fontWeight: 500,
						color: hasNarrative
							? "var(--type-humanitarian)"
							: "var(--text-muted)",
						lineHeight: 1,
						letterSpacing: structured ? undefined : "0.04em",
					}}
				>
					{heroLabel}
				</span>
			</div>

			<div
				style={{
					background: "var(--bg-overlay)",
					borderRadius: "2px",
					marginBottom: "7px",
					height: "3px",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						height: "100%",
						width: animate ? `${barPct}%` : "0%",
						background: "var(--type-humanitarian)",
						borderRadius: "2px",
						transition: "width 1.1s cubic-bezier(0.4, 0, 0.2, 1)",
					}}
				/>
			</div>

			<p
				style={{
					fontFamily: "'IBM Plex Mono', monospace",
					fontSize: "9px",
					color: "var(--text-muted)",
					margin: showNarrativeBlock ? "0 0 6px" : 0,
					lineHeight: 1.35,
				}}
			>
				{footerLine}
			</p>

			{showNarrativeBlock ? (
				<div className="ci-score-reason-wrap">
					<p
						className="ci-score-reason-text"
						style={{
							fontFamily: "'IBM Plex Mono', monospace",
							fontSize: "9px",
							color: "var(--text-muted)",
							lineHeight: 1.45,
							margin: 0,
						}}
					>
						{bodyText}
					</p>
				</div>
			) : null}
		</div>
	);
}
