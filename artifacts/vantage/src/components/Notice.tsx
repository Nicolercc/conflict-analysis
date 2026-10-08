import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { SiteHeader } from "./LiveTicker";
import "./Notice.css";

/** Shared frame: header, a live status line for assistive tech, and the main landmark. */
export function Shell({ status, children }: { status: string; children: ReactNode }) {
	return (
		<div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
			{/* First tab stop: jump past the header straight to the page's content. */}
			<a
				href="#main"
				className="skip-link"
				onClick={(e) => {
					// Move focus as well as the view, so the next Tab continues from the content.
					e.preventDefault();
					document.getElementById("main")?.focus();
				}}
			>
				Skip to content
			</a>
			<SiteHeader />
			<div role="status" className="sr-only">
				{status}
			</div>
			<main id="main" tabIndex={-1} style={{ outline: "none" }}>
				{children}
			</main>
		</div>
	);
}

/** A centred message with its heading focused, for states that replace the page. */
export function Notice({
	eyebrow,
	title,
	children,
}: {
	eyebrow: string;
	title: string;
	children: ReactNode;
}) {
	const headingRef = useRef<HTMLHeadingElement | null>(null);
	useEffect(() => {
		headingRef.current?.focus();
	}, [title]);

	return (
		<div className="ci-notice">
			<p className="ci-notice__eyebrow">{eyebrow}</p>
			<h1 ref={headingRef} tabIndex={-1} className="ci-notice__title">
				{title}
			</h1>
			{children}
		</div>
	);
}
