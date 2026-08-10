import type { RelatedEvent } from "@workspace/api-client-react";

const TYPE_COLORS: Record<string, string> = {
	strike: "var(--type-strike)",
	escalation: "var(--type-escalation)",
	negotiation: "var(--type-negotiation)",
	humanitarian: "var(--type-humanitarian)",
	political: "var(--type-political)",
};

const TYPE_LABELS: Record<string, string> = {
	strike: "Strike",
	escalation: "Escalation",
	negotiation: "Negotiation",
	humanitarian: "Humanitarian",
	political: "Political",
};

export function EventTimeline({
	events,
	active,
}: {
	events: RelatedEvent[];
	active: boolean;
}) {
	return (
		<div style={{ display: "flex", flexDirection: "column" as const, gap: "1px" }}>
			{events.map((evt, i) => {
				const color = TYPE_COLORS[evt.type] ?? "var(--text-muted)";
				const label = TYPE_LABELS[evt.type] ?? evt.type;
				const searchUrl = evt.searchQuery
					? "https://news.google.com/search?q=" +
						encodeURIComponent(evt.searchQuery)
					: undefined;

				return (
					<div
						key={i}
						className="tl-r"
						style={{
							display: "grid",
							gridTemplateColumns: "68px 14px 1fr",
							gap: "0 9px",
							alignItems: "start",
							opacity: active ? 1 : 0,
							transform: active ? "translateY(0)" : "translateY(10px)",
							transition: "opacity 0.4s ease, transform 0.4s ease",
							transitionDelay: 400 + i * 200 + "ms",
						}}
					>
						<span
							style={{
								fontFamily: "'IBM Plex Mono', monospace",
								fontSize: "11px",
								color: "var(--text-muted)",
								textAlign: "right",
								paddingTop: "2px",
							}}
						>
							{evt.date}
						</span>
						<div
							style={{
								display: "flex",
								flexDirection: "column" as const,
								alignItems: "center",
								paddingTop: "5px",
							}}
						>
							<div
								style={{
									width: "7px",
									height: "7px",
									borderRadius: "50%",
									background: color,
									flexShrink: 0,
								}}
							/>
							{i < events.length - 1 ? (
								<div
									style={{
										width: "1px",
										flex: 1,
										background: "var(--border-light)",
										minHeight: "16px",
										marginTop: "3px",
									}}
								/>
							) : null}
						</div>
						<div>
							<div
								style={{
									fontFamily: "'IBM Plex Mono', monospace",
									fontSize: "10px",
									letterSpacing: "0.08em",
									color,
									marginBottom: "1px",
									textTransform: "uppercase" as const,
								}}
							>
								{label}
							</div>
							<div
								style={{
									fontSize: "14px",
									fontWeight: 500,
									color: "var(--text-primary)",
									marginBottom: "1px",
									lineHeight: 1.35,
								}}
							>
								{evt.title}
							</div>
							<p
								style={{
									fontSize: "13px",
									color: "var(--text-secondary)",
									marginTop: "1px",
									marginBottom: 0,
									lineHeight: 1.45,
								}}
							>
								{evt.description.length > 160
									? evt.description.slice(0, 160).trim() + "…"
									: evt.description}
							</p>
							<div className="tl-det">
								<p
									style={{
										fontFamily: "'Source Serif 4', Georgia, serif",
										fontSize: "14px",
										lineHeight: 1.6,
										color: "var(--text-muted)",
										marginTop: "5px",
										marginBottom: searchUrl ? "8px" : 0,
									}}
								>
									{evt.description}
								</p>
								{searchUrl ? (
									<a
										href={searchUrl}
										target="_blank"
										rel="noopener noreferrer"
										style={{
											fontFamily: "'IBM Plex Mono', monospace",
											fontSize: "11px",
											color: "var(--accent-navy)",
											textDecoration: "none",
											letterSpacing: "0.05em",
										}}
									>
										Verify on Google News ↗
									</a>
								) : null}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
