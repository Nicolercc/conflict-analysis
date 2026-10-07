import { useEffect, useState } from "react";
import "./AnalysisLoader.css";

/** What the server does for every brief, in order. Shown as a list, not as fake progress. */
const STEPS = [
	"Retrieve recent coverage and background",
	"Generate the brief",
	"Check it against the response contract, locations and dates",
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

export function AnalysisLoader() {
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
							{STEPS.map((label) => (
								<li key={label} className="analysis-loader__step">
									<span>{label}</span>
								</li>
							))}
						</ol>
					</div>

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
