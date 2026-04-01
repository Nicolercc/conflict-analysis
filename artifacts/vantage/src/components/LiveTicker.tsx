import { Link } from "wouter";

function homeSectionHref(fragment: string) {
	const base = import.meta.env.BASE_URL.replace(/\/$/, "");
	return base ? `${base}/#${fragment}` : `/#${fragment}`;
}

/**
 * Single site-wide header: centered nav, same glass treatment everywhere.
 */
export function SiteHeader({
	onReset,
}: {
	onReset?: () => void;
}) {
	return (
		<header className="site-header" role="banner">
			<div className="site-header__cell site-header__cell--left">
				<Link
					href="/"
					className="site-header__brand"
					onClick={(e) => {
						if (onReset) {
							e.preventDefault();
							onReset();
						}
					}}
					aria-label="Vantage home"
				>
					<span className="site-header__brand-name">Vantage</span>
					<span className="site-header__brand-tag">conflict, in context.</span>
				</Link>
			</div>

			<nav
				className="site-header__cell site-header__cell--center"
				aria-label="Primary"
			>
				<a href={homeSectionHref("features")}>Why it matters</a>
				<a href={homeSectionHref("search")}>Search</a>
			</nav>

			<div className="site-header__cell site-header__cell--right">
				<span className="site-header__pill">Beta</span>
			</div>
		</header>
	);
}
