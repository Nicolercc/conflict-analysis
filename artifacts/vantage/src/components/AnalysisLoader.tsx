import { useEffect, useState } from "react";
import type { RetrievalStatus, Source } from "@workspace/api-client-react";
import "./AnalysisLoader.css";

type Stage = "retrieving" | "writing" | "locating";

/** What the server does for every brief, in order. The current one is reported by the server. */
const STEPS: { stage: Stage; label: string }[] = [
	{ stage: "retrieving", label: "Retrieve recent coverage and background" },
	{ stage: "writing", label: "Write the brief and check every citation against its source" },
	{ stage: "locating", label: "Look up each place on the map" },
];

const READING_NOTES = [
	"Two independent sources beat one loud headline, especially on fast-moving conflicts.",
	"Note the date on every map and casualty count; they go stale in hours.",
	"When parties disagree, quote the claim and attribute it.",
	"Primary documents such as orders and transcripts outrank anonymous social clips.",
	"Name the corridor, border or city when you can; geography carries meaning.",
];

function formatElapsed(totalSec: number) {
	const m = Math.floor(totalSec / 60);
	const s = totalSec % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AnalysisLoader({
	stage,
	sources,
	retrieval,
}: {
	/** The step the server says it is on; null until it reports one. */
	stage: Stage | null;
	/** The sources retrieval found; null until retrieval finishes. */
	sources: Source[] | null;
	retrieval: RetrievalStatus[];
}) {
	const stageIndex = STEPS.findIndex((s) => s.stage === stage);
	const outlets = sources ? new Set(sources.map((s) => s.publisher)).size : 0;
	const unreachable = retrieval.filter((r) => r.status === "failed").length;
	const [elapsedSec, setElapsedSec] = useState(0);
	const [noteIdx, setNoteIdx] = useState(0);

	useEffect(() => {
		const start = performance.now();
		const id = window.setInterval(() => {
			setElapsedSec(Math.floor((performance.now() - start) / 1000));
		}, 1000);
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		const id = window.setInterval(
			() => setNoteIdx((i) => (i + 1) % READING_NOTES.length),
			9000,
		);
		return () => clearInterval(id);
	}, []);

	return (
		<div className="analysis-loader">
			<div className="analysis-loader__shell">
				<header className="analysis-loader__top">
					<p className="analysis-loader__eyebrow">Generating briefing</p>
					<h1 className="analysis-loader__title">Building your brief</h1>
					<p className="analysis-loader__lede">
						This usually takes under half a minute. The first request after a
						quiet spell can take about a minute while the server wakes up.
					</p>

					<div className="analysis-loader__progress-block">
						<div className="analysis-loader__progress-meta">
							<div className="analysis-loader__elapsed-block">
								<p className="analysis-loader__elapsed-label">Elapsed</p>
								{/* Not a live region: a ticking clock would be announced every second. */}
								<p className="analysis-loader__elapsed-value">
									{formatElapsed(elapsedSec)}
								</p>
							</div>
						</div>
						<div
							className="analysis-loader__progress-track"
							role="progressbar"
							aria-label="Generating brief"
						>
							<div className="analysis-loader__progress-fill analysis-loader__progress-fill--indeterminate" />
						</div>
					</div>
				</header>

				<section className="analysis-loader__status">
					<div>
						<p className="analysis-loader__steps-head">What happens now</p>
						<ol className="analysis-loader__steps">
							{STEPS.map(({ label }, i) => {
								const state = i < stageIndex ? "done" : i === stageIndex ? "current" : "todo";
								return (
									<li
										key={label}
										className={`analysis-loader__step analysis-loader__step--${state}`}
										aria-current={state === "current" ? "step" : undefined}
									>
										<span>
											{label}
											{state === "done" ? <span className="sr-only"> (done)</span> : null}
											{state === "current" ? <span className="sr-only"> (in progress)</span> : null}
										</span>
									</li>
								);
							})}
						</ol>
					</div>

					{sources !== null && (
						<div className="analysis-loader__found">
							<p className="analysis-loader__steps-head">
								{sources.length === 0
									? "No recent coverage found"
									: `Reading ${sources.length} ${sources.length === 1 ? "source" : "sources"} from ${outlets} ${outlets === 1 ? "outlet" : "outlets"}`}
							</p>
							{sources.length === 0 ? (
								<p className="analysis-loader__found-note">
									The brief will rest on the model&apos;s background knowledge and
									will say so.
								</p>
							) : (
								<ul className="analysis-loader__found-list">
									{sources.slice(0, 8).map((s) => (
										<li key={s.id}>
											<strong>{s.publisher}</strong> {s.title}
										</li>
									))}
								</ul>
							)}
							{sources.length > 8 ? (
								<p className="analysis-loader__found-note">and {sources.length - 8} more</p>
							) : null}
							{unreachable > 0 ? (
								<p className="analysis-loader__found-note">
									{unreachable} {unreachable === 1 ? "service" : "services"} could not be reached.
								</p>
							) : null}
						</div>
					)}

					<div className="analysis-loader__tips">
						<p className="analysis-loader__tips-label">While you wait</p>
						<p className="analysis-loader__tips-body">
							{READING_NOTES[noteIdx]}
						</p>
					</div>
				</section>
			</div>
		</div>
	);
}
