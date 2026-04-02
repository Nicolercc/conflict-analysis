import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Search, ShieldCheck, MapPinned, Clock3 } from "lucide-react";
import { SiteHeader } from "@/components/LiveTicker";
import "./HomePage.css";

const QUICK_TOPICS = [
	"Red Sea shipping tensions",
	"Sudan humanitarian access",
	"Gaza ceasefire reporting",
	"Ukraine front-line updates",
];

const fadeUp = {
	initial: { opacity: 0, y: 18 },
	animate: { opacity: 1, y: 0 },
};

function isLikelyGeopolitical(query: string): boolean {
	const words = query.trim().split(/\s+/).filter(Boolean);
	if (words.length < 2) return false;
	const keywords = [
		"war",
		"conflict",
		"crisis",
		"ceasefire",
		"strike",
		"attack",
		"tension",
		"sanctions",
		"troops",
		"humanitarian",
		"coup",
		"protest",
		"siege",
		"invasion",
		"occupation",
		"refugee",
		"displacement",
		"nuclear",
		"drone",
		"missile",
		"militia",
		"insurgency",
		"treaty",
		"negotiation",
		"peace",
		"blockade",
		"airstrike",
		"coalition",
		"hostage",
		"famine",
		"massacre",
		"bombing",
		"withdrawal",
		"offensive",
		"frontline",
		"airspace",
		"embargo",
		"proxy",
		"detention",
		"uprising",
	];
	const q = query.toLowerCase();
	if (words.length >= 5) return true;
	return keywords.some((k) => q.includes(k));
}

export function Home() {
	const [topic, setTopic] = useState("");
	const [offTopicHint, setOffTopicHint] = useState(false);
	const [, setLocation] = useLocation();
	const canSearch = topic.trim().length >= 3;
	const reduceMotion = useReducedMotion();

	const transition = reduceMotion
		? { duration: 0 }
		: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const query = topic.trim();
		if (!query) return;
		if (!isLikelyGeopolitical(query)) {
			setOffTopicHint(true);
			return;
		}
		setOffTopicHint(false);
		setLocation(`/analysis?topic=${encodeURIComponent(query)}`);
	};

	const applyQuickTopic = (q: string) => {
		setTopic(q);
		document.getElementById("search-input")?.focus();
	};

	return (
		<div className="home">
			<SiteHeader />

			<main>
				<section className="home-hero" aria-labelledby="home-hero-title">
					<div className="home-hero__mesh" aria-hidden />
					<div className="home-hero__grain" aria-hidden />
					<div className="home-hero__inner">
						<motion.p
							className="home-kicker"
							{...fadeUp}
							transition={{ ...transition, delay: reduceMotion ? 0 : 0.05 }}
						>
							<span className="home-kicker__dot" aria-hidden />
							For reporters, editors &amp; engaged citizens
						</motion.p>

						<motion.h1
							id="home-hero-title"
							className="home-title"
							{...fadeUp}
							transition={{ ...transition, delay: reduceMotion ? 0 : 0.12 }}
						>
							See the full story behind the headline.
						</motion.h1>

						<motion.p
							className="home-lead"
							{...fadeUp}
							transition={{ ...transition, delay: reduceMotion ? 0 : 0.2 }}
						>
							Built for geopolitical conflicts, humanitarian crises, and regional
							tensions. Paste an article link or search a specific event — we assemble
							verification signals, timelines, perspectives, and geography.
						</motion.p>

						<motion.div
							id="search"
							{...fadeUp}
							transition={{ ...transition, delay: reduceMotion ? 0 : 0.28 }}
						>
							<form className="home-search" onSubmit={handleSubmit} role="search">
								<label htmlFor="search-input" className="sr-only">
									Search for a conflict topic
								</label>
								<div className="home-search__row">
									<span className="home-search__icon" aria-hidden>
										<Search size={22} strokeWidth={2} />
									</span>
									<input
										id="search-input"
										className="home-search__input"
										type="search"
										value={topic}
										onChange={(e) => {
											setTopic(e.currentTarget.value);
											setOffTopicHint(false);
										}}
										placeholder="e.g. Gaza ceasefire, Red Sea tensions, Sudan crisis..."
										autoComplete="off"
										autoCapitalize="sentences"
										enterKeyHint="search"
									/>
									<button
										type="submit"
										className="home-search__submit"
										disabled={!canSearch}
									>
										Run briefing
									</button>
								</div>
								<p className="home-search__hint">
									Works best with specific conflicts and crises · Article links
									supported · No account required
								</p>
							</form>
							{offTopicHint ? (
								<p
									style={{
										fontFamily: "var(--mono)",
										fontSize: "11px",
										color: "var(--accent)",
										marginTop: "8px",
										marginBottom: "0",
									}}
								>
									Try a specific conflict or paste an article link — e.g. &quot;Gaza
									ceasefire&quot; or &quot;Red Sea shipping tensions&quot;
								</p>
							) : null}
						</motion.div>

						<motion.div
							className="home-chips"
							aria-label="Example searches"
							{...fadeUp}
							transition={{ ...transition, delay: reduceMotion ? 0 : 0.36 }}
						>
							<p
								style={{
									flexBasis: "100%",
									textAlign: "center",
									fontFamily: "var(--mono)",
									fontSize: "10px",
									textTransform: "uppercase",
									letterSpacing: ".08em",
									color: "var(--color-text-secondary)",
									marginBottom: "10px",
								}}
							>
								Try one of these →
							</p>
							{QUICK_TOPICS.map((q) => (
								<button
									key={q}
									type="button"
									className="home-chip"
									onClick={() => applyQuickTopic(q)}
								>
									{q}
								</button>
							))}
						</motion.div>
					</div>
				</section>

				<section
					id="features"
					className="home-band"
					aria-labelledby="features-title"
				>
					<div className="home-band__inner">
						<header className="home-band__head">
							<p className="home-band__label">Why teams open this first</p>
							<p
								style={{
									fontSize: "clamp(15px, 1.8vw, 17px)",
									lineHeight: 1.6,
									color: "var(--text-secondary)",
									maxWidth: "36rem",
									margin: "0 auto 12px",
								}}
							>
								Search a specific conflict, humanitarian crisis, or geopolitical
								event.
							</p>
							<h2 id="features-title" className="home-band__title">
								Built for speed, anchored in evidence
							</h2>
						</header>

						<div className="home-features">
							<article className="home-feature">
								<div className="home-feature__icon" aria-hidden>
									<ShieldCheck size={22} strokeWidth={2} />
								</div>
								<h3 className="home-feature__title">Source-aware briefings</h3>
								<p className="home-feature__text">
									See where reporting agrees, where it diverges, and how credible the
									signal is—before you quote a line.
								</p>
							</article>
							<article className="home-feature">
								<div
									className="home-feature__icon home-feature__icon--teal"
									aria-hidden
								>
									<Clock3 size={22} strokeWidth={2} />
								</div>
								<h3 className="home-feature__title">Timelines that hold up</h3>
								<p className="home-feature__text">
									Sequence events with dates and context so your narrative matches
									the record—not the algorithm.
								</p>
							</article>
							<article className="home-feature">
								<div
									className="home-feature__icon home-feature__icon--blue"
									aria-hidden
								>
									<MapPinned size={22} strokeWidth={2} />
								</div>
								<h3 className="home-feature__title">Geography you can point to</h3>
								<p className="home-feature__text">
									Place the story on the map: focal points, related flashpoints, and
									how they connect.
								</p>
							</article>
						</div>
					</div>
				</section>

				<section className="home-strip" aria-labelledby="strip-heading">
					<div className="home-strip__inner">
						<h2 id="strip-heading" className="sr-only">
							Our commitment
						</h2>
						<p className="home-strip__text">
							&quot;In a news cycle measured in seconds, context is a public good. This
							tool exists to give journalists and readers the same thing: clarity under
							pressure.&quot;
						</p>
						<p className="home-strip__meta">
							Designed for editorial rigor · Structured for civic understanding
						</p>
					</div>
				</section>
			</main>

			<footer className="home-footer">
				Vantage · Conflict intelligence in context
			</footer>
		</div>
	);
}
