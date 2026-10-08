import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
	getGetBriefQueryKey,
	useGetBrief,
	type IntelligenceBrief,
	type RetrievalStatus,
	type Source,
} from "@workspace/api-client-react";
import { briefPath, parseBriefRequest } from "@/lib/brief-request";
import { BriefError, streamBrief, type BriefStage } from "@/lib/brief-stream";
import { Notice, Shell } from "./Notice";
import { AnalysisLoader } from "./AnalysisLoader";
import { BriefView } from "./BriefView";
import "./ConflictAnalysisPageLayout.css";

const SUGGESTED_TOPICS = [
	"Gaza ceasefire reporting",
	"Red Sea shipping tensions",
	"Sudan humanitarian access",
	"Ukraine front-line updates",
];

type Generation =
	| { phase: "loading"; stage: BriefStage | null; sources: Source[] | null; retrieval: RetrievalStatus[] }
	| { phase: "error"; message: string }
	| { phase: "out-of-scope" };

const STARTING: Generation = { phase: "loading", stage: null, sources: null, retrieval: [] };

/**
 * /analysis — generate a brief for a topic, link or pasted text, showing what
 * the server is doing. A finished brief moves to its permanent address.
 */
export function ConflictAnalysisPageRoute() {
	const search = useSearch();
	const [, navigate] = useLocation();
	const queryClient = useQueryClient();
	const request = useMemo(() => parseBriefRequest(search), [search]);
	const [state, setState] = useState<Generation>(STARTING);
	const current = useRef<AbortController | null>(null);

	const run = useCallback(() => {
		if (!request) return;
		current.current?.abort();
		const controller = new AbortController();
		current.current = controller;
		setState(STARTING);
		streamBrief(
			request,
			(event) => {
				if (controller.signal.aborted) return;
				if (event.type === "stage") {
					setState((s) => (s.phase === "loading" ? { ...s, stage: event.stage } : s));
				} else if (event.type === "sources") {
					setState((s) =>
						s.phase === "loading" ? { ...s, sources: event.sources, retrieval: event.retrieval } : s,
					);
				}
			},
			controller.signal,
		)
			.then((brief: IntelligenceBrief) => {
				if (controller.signal.aborted) return;
				if (brief.inScope === false) {
					setState({ phase: "out-of-scope" });
					return;
				}
				// The brief is already in hand: its own page must not fetch it again.
				queryClient.setQueryData(getGetBriefQueryKey(brief.id), brief);
				navigate(`/brief/${brief.id}`, { replace: true });
			})
			.catch((err: unknown) => {
				if (controller.signal.aborted) return;
				setState({
					phase: "error",
					message:
						err instanceof BriefError
							? err.message
							: "We couldn't generate this brief. Please try again.",
				});
			});
	}, [request, navigate, queryClient]);

	useEffect(() => {
		run();
		return () => current.current?.abort();
	}, [run]);

	useEffect(() => {
		document.title =
			request && state.phase === "loading"
				? "Generating brief · Vantage"
				: state.phase === "out-of-scope"
					? "Outside scope · Vantage"
					: "Vantage";
	}, [request, state.phase]);

	if (!request) {
		return (
			<Shell status="Nothing to brief.">
				<Notice eyebrow="Nothing to brief" title="Start with a topic, a link or an article">
					<p className="ci-notice__text">
						This page needs something to brief. Pasted article text is kept only
						in the tab it was pasted into, so it is not available after the tab
						is closed or the link is shared.
					</p>
					<Link href="/" className="ci-notice__primary">
						Back to search
					</Link>
				</Notice>
			</Shell>
		);
	}

	if (state.phase === "loading") {
		const status =
			state.sources === null
				? "Generating your brief."
				: `Found ${state.sources.length} ${state.sources.length === 1 ? "source" : "sources"}. Writing your brief.`;
		return (
			<Shell status={status}>
				<div style={{ paddingTop: "56px" }}>
					<AnalysisLoader stage={state.stage} sources={state.sources} retrieval={state.retrieval} />
				</div>
			</Shell>
		);
	}

	if (state.phase === "error") {
		return (
			<Shell status={`The brief could not be generated. ${state.message}`}>
				<Notice eyebrow="Brief not generated" title="We couldn't generate this brief">
					<p className="ci-notice__text">{state.message}</p>
					<div className="ci-notice__actions">
						<button type="button" className="ci-notice__primary" onClick={run}>
							Try again
						</button>
						<Link href="/" className="ci-notice__secondary">
							Change the search
						</Link>
					</div>
				</Notice>
			</Shell>
		);
	}

	return (
		<Shell status="This is outside what Vantage briefs.">
			<Notice eyebrow="Outside scope" title="We couldn't find a conflict to brief">
				<p className="ci-notice__text">
					Vantage covers geopolitical conflicts, humanitarian crises and
					regional tensions. Try one of these:
				</p>
				<div className="ci-notice__actions">
					{SUGGESTED_TOPICS.map((topic) => (
						<button
							key={topic}
							type="button"
							className="ci-notice__chip"
							onClick={() => navigate(briefPath({ kind: "topic", topic }))}
						>
							{topic}
						</button>
					))}
				</div>
				<Link href="/" className="ci-notice__secondary">
					Change the search
				</Link>
			</Notice>
		</Shell>
	);
}

/** /brief/:id — a saved brief at its permanent address. Nothing is regenerated. */
export function StoredBriefRoute() {
	const { id = "" } = useParams<{ id: string }>();
	const { data, isPending, error } = useGetBrief(id, {
		query: {
			queryKey: getGetBriefQueryKey(id),
			// A saved brief never changes.
			staleTime: Number.POSITIVE_INFINITY,
			retry: (failures, err) => (err as { status?: number })?.status !== 404 && failures < 2,
		},
	});

	useEffect(() => {
		if (isPending) document.title = "Opening brief · Vantage";
		else if (!data) document.title = "Brief not available · Vantage";
	}, [isPending, data]);

	if (data) return <BriefView brief={data} />;

	if (isPending) {
		return (
			<Shell status="Opening the brief.">
				<p className="ci-opening">Opening the brief…</p>
			</Shell>
		);
	}

	const missing = (error as { status?: number } | null)?.status === 404;
	return (
		<Shell status={missing ? "This brief is no longer available." : "The brief could not be opened."}>
			<Notice
				eyebrow={missing ? "Brief not available" : "Brief not opened"}
				title={missing ? "This brief is no longer available" : "We couldn't open this brief"}
			>
				<p className="ci-notice__text">
					{missing
						? "The link may be mistyped, or the saved copy may have been removed. You can generate a fresh brief on the same topic."
						: "The server did not answer. Check your connection and reload the page."}
				</p>
				<Link href="/" className="ci-notice__primary">
					New search
				</Link>
			</Notice>
		</Shell>
	);
}
