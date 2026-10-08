import { useEffect } from "react";
import { Link } from "wouter";
import { Notice, Shell } from "@/components/Notice";

export default function NotFound() {
	useEffect(() => {
		document.title = "Page not found · Vantage";
	}, []);

	return (
		<Shell status="Page not found.">
			<Notice eyebrow="Page not found" title="There is nothing at this address">
				<p className="ci-notice__text">
					The link may be mistyped, or the page may have moved. You can start a
					new brief from the search page.
				</p>
				<Link href="/" className="ci-notice__primary">
					Back to search
				</Link>
			</Notice>
		</Shell>
	);
}
