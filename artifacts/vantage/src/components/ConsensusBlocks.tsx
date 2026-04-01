import type { Verification } from "@workspace/api-client-react";

/** Agree / diverge blocks only — same data as VerificationPanel consensus section */
export function ConsensusBlocks({
	verification,
	active,
}: {
	verification: Verification | undefined;
	active: boolean;
}) {
	if (!verification) return null;

	return (
		<div
			style={{
				opacity: active ? 1 : 0,
				transform: active ? "translateY(0)" : "translateY(8px)",
				transition: "opacity 0.5s ease, transform 0.5s ease",
			}}
		>
			<span className="section-label">Source consensus</span>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "16px",
				}}
			>
				<div className="card" style={{ borderLeft: "3px solid var(--risk-low)" }}>
					<span
						style={{
							fontFamily: "'IBM Plex Mono', monospace",
							fontSize: "9px",
							color: "var(--risk-low)",
							letterSpacing: "0.12em",
							textTransform: "uppercase" as const,
							display: "block",
							marginBottom: "8px",
						}}
					>
						Where sources agree
					</span>
					<p
						style={{
							fontFamily: "'Source Serif 4', Georgia, serif",
							fontStyle: "italic",
							fontSize: "14px",
							color: "var(--text-secondary)",
							lineHeight: "1.6",
						}}
					>
						{verification.consensus}
					</p>
				</div>
				<div className="card" style={{ borderLeft: "3px solid var(--risk-medium)" }}>
					<span
						style={{
							fontFamily: "'IBM Plex Mono', monospace",
							fontSize: "9px",
							color: "var(--risk-medium)",
							letterSpacing: "0.12em",
							textTransform: "uppercase" as const,
							display: "block",
							marginBottom: "8px",
						}}
					>
						Where sources diverge
					</span>
					<p
						style={{
							fontFamily: "'Source Serif 4', Georgia, serif",
							fontStyle: "italic",
							fontSize: "14px",
							color: "var(--text-secondary)",
							lineHeight: "1.6",
						}}
					>
						{verification.divergence}
					</p>
				</div>
			</div>
		</div>
	);
}
