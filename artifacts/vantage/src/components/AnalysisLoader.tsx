import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type PointerEvent as ReactPointerEvent,
} from "react";
import "./AnalysisLoader.css";

const STEPS = [
	"Parsing article text",
	"Extracting location & actors",
	"Correlating historical events",
	"Scoring source credibility",
	"Building multi-perspective brief",
	"Running Claude verification pass",
];

const INTEL_TIPS = [
	"Two independent sources beat one loud headline—especially on fast-moving conflicts.",
	"Note the timestamp on maps and casualty counts; they go stale in hours.",
	"When parties disagree, quote the claim and attribute—readers deserve the trace.",
	"Primary documents (orders, transcripts) outrank anonymous social clips.",
	"Geography matters: name the corridor, border, or city block when you can.",
	"Slower filing with verified context often travels further than first blood.",
];

const MAX_BUBBLES = 12;
const SPAWN_MS = 1200;

/** e-folding time for progress curve (~63% of cap at this many ms). */
const PROGRESS_TAU_MS = 52_000;
/** Never show 100% until navigation away — server sends no streaming progress. */
const PROGRESS_CAP_PCT = 94;

const DEFAULT_BOUNDS = { w: 520, h: 260 };

function estimateProgress(elapsedMs: number) {
	const progress01 = 1 - Math.exp(-elapsedMs / PROGRESS_TAU_MS);
	const pct = Math.min(PROGRESS_CAP_PCT, Math.floor(100 * progress01));
	return { pct, progress01 };
}

function formatElapsed(ms: number) {
	const totalSec = Math.floor(ms / 1000);
	const m = Math.floor(totalSec / 60);
	const s = totalSec % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

type Bubble = {
	id: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	r: number;
	variant: 0 | 1;
};

function randomBubble(id: number, w: number, h: number): Bubble {
	const r = 12 + Math.random() * 10;
	return {
		id,
		x: r + Math.random() * Math.max(8, w - 2 * r),
		y: r + Math.random() * Math.max(8, h - 2 * r),
		vx: (Math.random() - 0.5) * 0.11,
		vy: (Math.random() - 0.5) * 0.11,
		r,
		variant: id % 2 === 0 ? 0 : 1,
	};
}

export function AnalysisLoader() {
	const [elapsedMs, setElapsedMs] = useState(0);
	const [bubbles, setBubbles] = useState<Bubble[]>([]);
	const [score, setScore] = useState(0);
	const [pops, setPops] = useState(0);
	const [tipIdx, setTipIdx] = useState(0);
	const [toast, setToast] = useState<string | null>(null);
	const [bounds, setBounds] = useState(DEFAULT_BOUNDS);
	const [reducedMotion, setReducedMotion] = useState(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	});

	const idRef = useRef(0);
	const rafRef = useRef(0);
	const lastTRef = useRef(0);
	const runningRef = useRef(false);
	const radarRef = useRef<HTMLDivElement | null>(null);
	const loadStartRef = useRef(
		typeof performance !== "undefined" ? performance.now() : 0,
	);

	useEffect(() => {
		const id = window.setInterval(() => {
			setElapsedMs(performance.now() - loadStartRef.current);
		}, 250);
		return () => clearInterval(id);
	}, []);

	useLayoutEffect(() => {
		const el = radarRef.current;
		if (!el) return;
		const measure = () => {
			const { width, height } = el.getBoundingClientRect();
			if (width > 40 && height > 40) {
				setBounds({ w: width, h: height });
			}
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sync = () => setReducedMotion(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);

	useEffect(() => {
		const t = setInterval(
			() => setTipIdx((i) => (i + 1) % INTEL_TIPS.length),
			9000,
		);
		return () => clearInterval(t);
	}, []);

	useEffect(() => {
		if (pops !== 5 && pops !== 12 && pops !== 25) return;
		const msg =
			pops === 5
				? "Analyst streak — signal discipline."
				: pops === 12
					? "Desk editor would be proud."
					: "Wire-speed reflexes — don't forget to hydrate.";
		setToast(msg);
		const timer = window.setTimeout(() => setToast(null), 2600);
		return () => clearTimeout(timer);
	}, [pops]);

	const spawn = useCallback(() => {
		const { w, h } = bounds;
		setBubbles((prev) => {
			if (prev.length >= MAX_BUBBLES) return prev;
			idRef.current += 1;
			return [...prev, randomBubble(idRef.current, w, h)];
		});
	}, [bounds.w, bounds.h]);

	useEffect(() => {
		if (reducedMotion) return;
		spawn();
		spawn();
		const id = setInterval(spawn, SPAWN_MS);
		return () => clearInterval(id);
	}, [reducedMotion, spawn]);

	useEffect(() => {
		if (reducedMotion) return;
		runningRef.current = true;
		lastTRef.current = performance.now();
		const { w, h } = bounds;

		const tick = (now: number) => {
			if (!runningRef.current) return;
			const dt = Math.min(48, now - lastTRef.current);
			lastTRef.current = now;

			setBubbles((prev) =>
				prev.map((b) => {
					let nx = b.x + b.vx * dt;
					let ny = b.y + b.vy * dt;
					let vx = b.vx;
					let vy = b.vy;
					const { r } = b;
					if (nx < r) {
						nx = r;
						vx *= -1;
					} else if (nx > w - r) {
						nx = w - r;
						vx *= -1;
					}
					if (ny < r) {
						ny = r;
						vy *= -1;
					} else if (ny > h - r) {
						ny = h - r;
						vy *= -1;
					}
					return { ...b, x: nx, y: ny, vx, vy };
				}),
			);

			rafRef.current = requestAnimationFrame(tick);
		};

		rafRef.current = requestAnimationFrame(tick);
		return () => {
			runningRef.current = false;
			cancelAnimationFrame(rafRef.current);
		};
	}, [reducedMotion, bounds.w, bounds.h]);

	const popBubble = useCallback((id: number) => {
		setBubbles((prev) => prev.filter((b) => b.id !== id));
		setScore((s) => s + 12);
		setPops((p) => p + 1);
	}, []);

	const onBubblePointer = useCallback(
		(e: ReactPointerEvent<HTMLButtonElement>, id: number) => {
			e.preventDefault();
			popBubble(id);
		},
		[popBubble],
	);

	const { pct: progressPct, progress01 } = estimateProgress(elapsedMs);
	const completedSteps = Math.min(
		STEPS.length,
		Math.round(progress01 * STEPS.length),
	);

	return (
		<div className="analysis-loader">
			<div className="analysis-loader__shell">
				<header className="analysis-loader__top">
					<p className="analysis-loader__eyebrow">Generating briefing</p>
					<h1 className="analysis-loader__title">Building your dossier</h1>
					<p className="analysis-loader__lede">
						Analysis can take a minute or more. The mini-game below is only for
						waiting—your briefing quality does not depend on it.
					</p>

					<div className="analysis-loader__progress-block">
						<div className="analysis-loader__progress-meta">
							<div className="analysis-loader__elapsed-block">
								<p className="analysis-loader__elapsed-label">Elapsed</p>
								<p
									className="analysis-loader__elapsed-value"
									aria-live="polite"
									aria-atomic="true"
								>
									{formatElapsed(elapsedMs)}
								</p>
							</div>
							<div className="analysis-loader__progress-label analysis-loader__progress-label--right">
								<span>Estimated progress</span>
								<span className="analysis-loader__progress-pct">{progressPct}%</span>
							</div>
						</div>
						<div
							className="analysis-loader__progress-track"
							role="progressbar"
							aria-valuemin={0}
							aria-valuemax={PROGRESS_CAP_PCT}
							aria-valuenow={progressPct}
							aria-valuetext={`Estimated ${progressPct} percent complete; ${formatElapsed(elapsedMs)} elapsed`}
						>
							<div
								className="analysis-loader__progress-fill"
								style={{ width: `${progressPct}%` }}
							/>
						</div>
						<p className="analysis-loader__progress-honest">
							The model does not stream live completion data—we show a{" "}
							<strong>time-based estimate</strong> (typical runs about{" "}
							<strong>1–3 minutes</strong>; complex topics can take longer). The bar
							approaches {PROGRESS_CAP_PCT}% and then holds until your briefing is
							ready.
						</p>
					</div>
				</header>

				<div className="analysis-loader__grid">
					<section
						className="analysis-loader__play"
						aria-label="Intel sweep — tap bubbles while you wait"
					>
						<div
							ref={radarRef}
							className="analysis-loader__radar"
							role="application"
						>
							<div className="analysis-loader__radar-grid" aria-hidden />
							<div className="analysis-loader__radar-sweep" aria-hidden />
							<div className="analysis-loader__radar-vignette" aria-hidden />
							<span className="analysis-loader__radar-caption">Intel sweep</span>
							<span className="analysis-loader__radar-hint">
								{reducedMotion
									? "Reduced motion on — game hidden"
									: "Tap bubbles · +12 pts · does not affect your report"}
							</span>

							{!reducedMotion &&
								bubbles.map((b) => (
									<button
										key={b.id}
										type="button"
										className="analysis-loader__bubble"
										style={{
											left: b.x - b.r,
											top: b.y - b.r,
											width: b.r * 2,
											height: b.r * 2,
											background:
												b.variant === 0
													? "radial-gradient(circle at 32% 28%, color-mix(in srgb, var(--accent) 72%, white), var(--accent))"
													: "radial-gradient(circle at 32% 28%, color-mix(in srgb, var(--accent-navy) 48%, white), var(--accent-navy))",
										}}
										onPointerDown={(e) => onBubblePointer(e, b.id)}
										aria-label="Pop intel bubble"
									/>
								))}

							{reducedMotion && (
								<p className="analysis-loader__radar-fallback">
									Briefing engine running. Read the field notes on the right.
								</p>
							)}
						</div>

						{toast ? (
							<div className="analysis-loader__toast" role="status">
								{toast}
							</div>
						) : null}

						<div className="analysis-loader__stats">
							<div className="analysis-loader__stat">
								<p className="analysis-loader__stat-label">Idle score</p>
								<p className="analysis-loader__stat-value">
									{score}
									<span className="analysis-loader__stat-suffix">pts</span>
								</p>
							</div>
							<div className="analysis-loader__stat">
								<p className="analysis-loader__stat-label">Bubbles tagged</p>
								<p className="analysis-loader__stat-value analysis-loader__stat-value--navy">
									{pops}
								</p>
							</div>
						</div>
					</section>

					<section className="analysis-loader__status">
						<div className="analysis-loader__tips">
							<p className="analysis-loader__tips-label">Field notes</p>
							<p key={tipIdx} className="analysis-loader__tips-body">
								{INTEL_TIPS[tipIdx]}
							</p>
						</div>

						<div>
							<p className="analysis-loader__steps-head">Pipeline steps</p>
							<ul className="analysis-loader__steps">
								{STEPS.map((label, i) => {
									const done = i < completedSteps;
									const active =
										i === completedSteps && completedSteps < STEPS.length;
									return (
										<li
											key={label}
											className={`analysis-loader__step${done ? " analysis-loader__step--done" : ""}${active ? " analysis-loader__step--active" : ""}`}
											style={{
												opacity: done ? 1 : active ? 0.92 : 0.28,
											}}
										>
											<span className="analysis-loader__step-mark" aria-hidden>
												{done ? "✓" : "○"}
											</span>
											<span>{label}</span>
										</li>
									);
								})}
							</ul>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
