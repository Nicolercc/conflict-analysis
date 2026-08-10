import type { Party } from "./conflict/types";

export function PartiesPanel({ parties, active }: { parties: Party[]; active: boolean }) {
	if (!parties.length) return null;

	return (
		<div
			style={{
				opacity: active ? 1 : 0,
				transition: "opacity 0.45s ease",
			}}
		>
			<span className="section-label">Parties involved</span>
			<div style={{ display: "flex", flexDirection: "column" as const, gap: "2px" }}>
				{parties.map((p, i) => (
					<div
						key={i}
						className="pr-r"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "9px",
						}}
					>
						<div
							style={{
								width: "7px",
								height: "7px",
								borderRadius: "50%",
								background: p.color,
								flexShrink: 0,
							}}
						/>
						<span
							style={{
								fontSize: "13px",
								color: "var(--text-secondary)",
							}}
						>
							{p.name}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
