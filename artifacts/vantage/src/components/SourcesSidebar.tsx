import type { VerificationSource } from "@workspace/api-client-react";

const REGION_COLORS: Record<string, string> = {
	Western: "var(--region-western)",
	"Middle East": "var(--region-mideast)",
	Asia: "var(--region-asia)",
	Africa: "var(--region-africa)",
	"Latin America": "var(--region-latam)",
	"State Media": "var(--region-state)",
};

/** Compact source rows — same API data as VerificationPanel source list */
export function SourcesSidebar({
	sources,
	active,
}: {
	sources: VerificationSource[] | undefined;
	active: boolean;
}) {
	if (!sources?.length) return null;

	return (
		<div
			style={{
				opacity: active ? 1 : 0,
				transition: "opacity 0.45s ease",
			}}
		>
			<span className="section-label">Sources</span>
			<div style={{ display: "flex", flexDirection: "column" as const, gap: "1px" }}>
				{sources.map((src, i) => {
					const color = REGION_COLORS[src.region] ?? "var(--text-muted)";
					return (
						<div
							key={i}
							className="ci-sr-row sr-r"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								padding: "6px 5px",
								borderRadius: "5px",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
								<span
									style={{
										fontFamily: "'IBM Plex Mono', monospace",
										fontSize: "8px",
										background: "var(--bg-subtle)",
										padding: "1px 5px",
										borderRadius: "3px",
										color: "var(--text-muted)",
										flexShrink: 0,
									}}
								>
									{src.region.slice(0, 2).toUpperCase()}
								</span>
								<span
									style={{
										fontSize: "12px",
										color: "var(--text-secondary)",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
									}}
								>
									{src.outlet}
								</span>
								<span
									style={{
										fontFamily: "'IBM Plex Mono', monospace",
										fontSize: "8px",
										color: "var(--text-muted)",
									}}
								>
									{src.region}
								</span>
							</div>
							<span style={{ fontSize: "10px", color: "var(--text-muted)" }}>›</span>
							<div
								className="ci-sr-pop sr-pop"
								role="tooltip"
								style={{
									right: "calc(100% + 8px)",
									top: "-4px",
									width: "195px",
									background: "var(--bg-surface)",
									border: "1px solid var(--border-light)",
									borderRadius: "7px",
									padding: "10px 12px",
									boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
								}}
							>
								<div
									style={{
										fontSize: "12px",
										fontWeight: 500,
										color: "var(--text-primary)",
										marginBottom: "4px",
									}}
								>
									{src.outlet}
								</div>
								<p
									style={{
										fontFamily: "'Source Serif 4', Georgia, serif",
										fontSize: "12px",
										lineHeight: 1.5,
										color: "var(--text-muted)",
										margin: 0,
									}}
								>
									{src.summary}
								</p>
								<span
									style={{
										fontFamily: "'IBM Plex Mono', monospace",
										fontSize: "8px",
										color,
										marginTop: "6px",
										display: "block",
									}}
								>
									{src.region}
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
