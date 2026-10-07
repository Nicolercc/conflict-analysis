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
}: {
	perspectives: Perspective[];
	active?: boolean;
}) {
	if (!perspectives.length) return null;

	return (
		<ul className="ci-perspectives">
			{perspectives.map((p, i) => (
				<li key={i} className="ci-perspective">
					<p className="ci-perspective__who">
						<span
							className="ci-perspective__alignment"
							style={{ color: ALIGNMENT_COLORS[p.alignment] ?? "var(--accent-navy)" }}
						>
							{p.alignment}
						</span>
						<span className="ci-perspective__actor">{p.actor}</span>
					</p>
					<p className="ci-perspective__framing">{p.framing}</p>
					<p className="ci-perspective__interest">
						<strong>Interest:</strong> {p.interests}
					</p>
				</li>
			))}
		</ul>
	);
}
