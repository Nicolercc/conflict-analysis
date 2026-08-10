import { useState, useEffect } from "react";

/** Compact score card layout aligned with vantage_redesign_preview.html */
export function AnimatedScore({
	score,
	label: _label,
	reason,
	active,
}: {
	score: number;
	label: string;
	reason: string;
	active: boolean;
}) {
	const [currentScore, setCurrentScore] = useState(0);

	useEffect(() => {
		if (!active) return;
		const duration = 1200;
		const start = performance.now();
		const animate = (time: number) => {
			const p = Math.min((time - start) / duration, 1);
			setCurrentScore(Math.round(p * score));
			if (p < 1) requestAnimationFrame(animate);
		};
		requestAnimationFrame(animate);
	}, [score, active]);

	const barColor = "var(--text-primary)";

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
					Source
					<br />
					credibility
				</span>
				<span
					style={{
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: "22px",
						fontWeight: 500,
						color: "var(--text-primary)",
						lineHeight: 1,
					}}
				>
					{currentScore}
					<span
						style={{
							fontSize: "11px",
							opacity: 0.4,
							fontWeight: 500,
						}}
					>
						/100
					</span>
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
						width: currentScore + "%",
						background: barColor,
						borderRadius: "2px",
						transition: "width 0.05s linear",
					}}
				/>
			</div>

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
					{reason}
				</p>
			</div>
		</div>
	);
}
