import { useState, useEffect } from "react";

const RISK_CFG = {
	Low: {
		color: "var(--risk-low)",
		fill: "25%",
	},
	Medium: {
		color: "var(--risk-medium)",
		fill: "55%",
	},
	High: {
		color: "var(--risk-high)",
		fill: "85%",
	},
};

export function EscalationMeter({
	level,
	reason,
	active,
}: {
	level: string;
	reason: string;
	active: boolean;
}) {
	const [animate, setAnimate] = useState(false);

	useEffect(() => {
		if (active) setTimeout(() => setAnimate(true), 200);
		else setAnimate(false);
	}, [active]);

	const cfg = RISK_CFG[level as keyof typeof RISK_CFG] ?? RISK_CFG.Medium;
	const levelWord = (level || "—").toUpperCase();

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
					Escalation
					<br />
					risk
				</span>
				<span
					style={{
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: "22px",
						fontWeight: 500,
						color: cfg.color,
						lineHeight: 1,
					}}
				>
					{levelWord}
				</span>
			</div>

			<div
				style={{
					height: "3px",
					background: "var(--bg-overlay)",
					borderRadius: "2px",
					marginBottom: "7px",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						height: "100%",
						width: animate ? cfg.fill : "0%",
						background: cfg.color,
						borderRadius: "2px",
						transition: "width 1.1s cubic-bezier(0.4, 0, 0.2, 1)",
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
