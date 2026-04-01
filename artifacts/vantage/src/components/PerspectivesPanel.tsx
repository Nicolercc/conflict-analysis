import type { Perspective } from "@workspace/api-client-react";

const ALIGNMENT_COLORS: Record<string, string> = {
	Western: "var(--region-western)",
	Regional: "var(--region-mideast)",
	"State Media": "var(--region-state)",
	"Civil Society": "var(--risk-low)",
	"Affected Population": "var(--risk-medium)",
};

export function PerspectivesPanel({
	perspectives,
	active,
}: {
	perspectives: Perspective[];
	active: boolean;
}) {
	return (
		<div
			style={{
				opacity: active ? 1 : 0,
				transition: "opacity 0.45s ease",
			}}
		>
			<span className="section-label" style={{ fontSize: "12px" }}>
				Geopolitical Perspectives
			</span>
			<p
				style={{
					fontFamily: "'Source Serif 4', Georgia, serif",
					fontStyle: "italic",
					fontSize: "15px",
					color: "var(--text-muted)",
					marginBottom: "12px",
					marginTop: "-6px",
				}}
			>
				Hover to read each perspective
			</p>

			<div
				style={{
					display: "flex",
					flexWrap: "wrap" as const,
					gap: "6px",
					position: "relative",
				}}
			>
				{perspectives.map((p, i) => {
					const color = ALIGNMENT_COLORS[p.alignment] ?? "var(--accent-navy)";
					return (
						<div key={i} className="pp-pill">
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "5px",
									padding: "5px 11px",
									background: "var(--bg-surface)",
									border: "1px solid var(--border-light)",
									borderRadius: "20px",
									cursor: "pointer",
									whiteSpace: "nowrap" as const,
								}}
							>
								<div
									style={{
										width: "5px",
										height: "5px",
										borderRadius: "50%",
										background: color,
										flexShrink: 0,
									}}
								/>
								<span
									style={{
										fontFamily: "'IBM Plex Mono', monospace",
										fontSize: "10px",
										letterSpacing: "0.07em",
										color: "var(--text-muted)",
									}}
								>
									{p.alignment.replace(/\u00A0/g, " ").toUpperCase()}
								</span>
								<span
									style={{
										fontSize: "13px",
										color: "var(--text-secondary)",
									}}
								>
									{p.actor}
								</span>
							</div>
							<div
								className="pp-pop"
								style={{
									top: "calc(100% + 6px)",
									left: 0,
									minWidth: "215px",
									background: "var(--bg-surface)",
									border: "1px solid var(--border-light)",
									borderRadius: "7px",
									padding: "11px 13px",
									boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
								}}
							>
								<p
									style={{
										fontFamily: "'Source Serif 4', Georgia, serif",
										fontStyle: "italic",
										fontSize: "15px",
										color: "var(--text-secondary)",
										margin: "0 0 7px",
										lineHeight: 1.5,
									}}
								>
									{p.framing}
								</p>
								<div
									style={{
										fontFamily: "'IBM Plex Mono', monospace",
										fontSize: "11px",
										color: "var(--text-muted)",
									}}
								>
									<span style={{ color }}>INTEREST: </span>
									{p.interests}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
