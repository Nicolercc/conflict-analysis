import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { SiteHeader } from "./LiveTicker";
import "./Notice.css";

/** Shared frame: header, a live status line for assistive tech, and the main landmark. */
export function Shell({ status, children }: { status: string; children: ReactNode }) {
	return (
		<div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
			<SiteHeader />
			<div role="status" className="sr-only">
				{status}
			</div>
			<main>{children}</main>
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
