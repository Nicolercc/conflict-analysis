import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
	IntelligenceBrief,
	RelatedEvent,
	RelatedEventType,
} from "@workspace/api-client-react";

const W = 800;
const H = 265;

const TYPE_META: Record<
	RelatedEventType,
	{ label: string; color: string; short: string }
> = {
	strike: {
		label: "Strike",
		color: "#C2536A",
		short: "Military or kinetic event",
	},
	escalation: {
		label: "Escalation",
		color: "#E07B39",
		short: "Heightened tensions or threat",
	},
	negotiation: {
		label: "Diplomacy",
		color: "#4A9B8B",
		short: "Talks or negotiated process",
	},
	humanitarian: {
		label: "Humanitarian",
		color: "#3B78D4",
		short: "Civilian impact or aid",
	},
	political: {
		label: "Political",
		color: "#9B7BC8",
		short: "Political or institutional move",
	},
};

const HUB_COLOR = "#1a3a52";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Null when either coordinate is unknown, so nothing is plotted at a default point. */
function toLatLng(p: {
	lat: number | null;
	lng: number | null;
}): L.LatLngTuple | null {
	return typeof p.lat === "number" && typeof p.lng === "number"
		? [p.lat, p.lng]
		: null;
}

/**
 * Events that happened in the same place would draw on top of each other (and
 * on the primary pin). Each one after the first is drawn a fixed distance to
 * the side, on a ring, so every marker stays visible and clickable. Only the
 * drawing moves; the coordinates are unchanged.
 */
export function overlapOffsets(
	hub: L.LatLngTuple | null,
	positions: L.LatLngTuple[],
	radius = 26,
): Array<[number, number]> {
	const key = (p: L.LatLngTuple) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
	const taken = new Map<string, number>();
	if (hub) taken.set(key(hub), 1);
	return positions.map((p) => {
		const n = taken.get(key(p)) ?? 0;
		taken.set(key(p), n + 1);
		if (n === 0) return [0, 0];
		const angle = -Math.PI / 6 + (n - 1) * (Math.PI / 3);
		return [Math.round(radius * Math.cos(angle)), Math.round(radius * Math.sin(angle))];
	});
}

function escapeHtml(s: string) {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function truncate(s: string, max: number) {
	const t = s.trim();
	if (t.length <= max) return t;
	return t.slice(0, max).trim() + "…";
}

function markerKind(evt: RelatedEvent): "strike" | "talks" | "affected" {
	const t = evt.type;
	if (t === "strike") return "strike";
	if (t === "negotiation") return "talks";
	return "affected";
}

function hubIconHtml(city: string) {
	const label = escapeHtml(truncate(city, 22));
	return `
<div class="ci-map-hub" aria-hidden="true">
  <div class="ci-map-hub__pulse"></div>
  <div class="ci-map-hub__pin">
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.3 0 0 6.1 0 13.6c0 10.2 14 22.4 14 22.4S28 23.8 28 13.6C28 6.1 21.7 0 14 0z" fill="${HUB_COLOR}"/>
      <circle cx="14" cy="13" r="5" fill="white" opacity="0.95"/>
    </svg>
  </div>
  <span class="ci-map-hub__label">${label}</span>
</div>`;
}

function eventIconHtml(evt: RelatedEvent) {
	const meta = TYPE_META[evt.type];
	const color = meta.color;
	const kind = markerKind(evt);

	if (kind === "strike") {
		return `
<div class="ci-map-ev ci-map-ev--strike" style="--ev:${color}">
  <span class="ci-map-ev__ring"></span>
  <span class="ci-map-ev__shape"></span>
</div>`;
	}
	if (kind === "talks") {
		return `
<div class="ci-map-ev ci-map-ev--talks" style="--ev:${color}">
  <span class="ci-map-ev__ring ci-map-ev__ring--slow"></span>
  <span class="ci-map-ev__dot"></span>
</div>`;
	}
	return `
<div class="ci-map-ev ci-map-ev--affected" style="--ev:${color}">
  <span class="ci-map-ev__ring"></span>
  <span class="ci-map-ev__dot"></span>
</div>`;
}

function eventTooltipHtml(evt: RelatedEvent) {
	const meta = TYPE_META[evt.type];
	return `
<div class="ci-leaflet-tip">
  <div class="ci-leaflet-tip__row">
    <span class="ci-leaflet-tip__badge" style="background:${meta.color}22;border-color:${meta.color}55;color:${meta.color}">${escapeHtml(meta.label)}</span>
    <span class="ci-leaflet-tip__date">${escapeHtml(evt.date)}</span>
  </div>
  <div class="ci-leaflet-tip__title">${escapeHtml(evt.title)}</div>
  <p class="ci-leaflet-tip__desc">${escapeHtml(truncate(evt.description, 220))}</p>
  <span class="ci-leaflet-tip__hint">${escapeHtml(meta.short)}</span>
</div>`;
}

function hubTooltipHtml(brief: IntelligenceBrief) {
	const loc = `${brief.location.city}, ${brief.location.country}`;
	return `
<div class="ci-leaflet-tip ci-leaflet-tip--hub">
  <span class="ci-leaflet-tip__badge ci-leaflet-tip__badge--hub">Primary focus</span>
  <div class="ci-leaflet-tip__title">${escapeHtml(loc)}</div>
  <p class="ci-leaflet-tip__desc">${escapeHtml(truncate(brief.headline, 200))}</p>
  <span class="ci-leaflet-tip__hint">Central location for this briefing</span>
</div>`;
}

const TOOLTIP_OPTS: L.TooltipOptions = {
	sticky: true,
	direction: "top",
	opacity: 1,
	className: "ci-leaflet-tooltip",
	interactive: true,
};

const TILE_ATTR =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface InteractiveConflictMapProps {
	data: IntelligenceBrief;
	active: boolean;
}

export function InteractiveConflictMap({
	data,
	active,
}: InteractiveConflictMapProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<L.Map | null>(null);
	const layersRef = useRef<{
		polylines: L.Polyline[];
		markers: L.Marker[];
	}>({ polylines: [], markers: [] });
	const [mapReady, setMapReady] = useState(false);

	useEffect(() => {
		if (!active) {
			setMapReady(false);
			return;
		}

		const el = containerRef.current;
		if (!el || mapRef.current) return;

		const map = L.map(el, {
			scrollWheelZoom: true,
			zoomControl: true,
			attributionControl: true,
			minZoom: 3,
			maxZoom: 14,
			worldCopyJump: true,
		});

		if (map.zoomControl) {
			map.zoomControl.setPosition("bottomright");
		}

		L.tileLayer(TILE_URL, {
			maxZoom: 19,
			attribution: TILE_ATTR,
		}).addTo(map);

		mapRef.current = map;
		setMapReady(true);

		const ro = new ResizeObserver(() => {
			map.invalidateSize({ animate: false });
		});
		ro.observe(el);

		return () => {
			ro.disconnect();
			map.remove();
			mapRef.current = null;
			setMapReady(false);
		};
	}, [active]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map || !mapReady || !active) return;

		layersRef.current.polylines.forEach((p) => {
			p.remove();
		});
		layersRef.current.markers.forEach((m) => {
			m.remove();
		});
		layersRef.current = { polylines: [], markers: [] };

		const hub = toLatLng(data.location);
		const located = data.relatedEvents.flatMap((evt) => {
			const pos = toLatLng(evt);
			return pos ? [{ evt, pos }] : [];
		});
		const points = [...(hub ? [hub] : []), ...located.map((l) => l.pos)];
		if (points.length === 0) {
			map.setView([20, 0], 2);
			return;
		}
		const bounds = L.latLngBounds(points);

		const lineStyle: L.PolylineOptions = {
			color: "#8a9aaa",
			weight: 1.5,
			opacity: 0.55,
			dashArray: "6 8",
			lineCap: "round",
		};

		if (hub) {
			located.forEach(({ pos }) => {
				const line = L.polyline([hub, pos], lineStyle).addTo(map);
				layersRef.current.polylines.push(line);
			});
		}

		const hubMarker = !hub ? null : L.marker(hub, {
			icon: L.divIcon({
				className: "ci-map-marker-wrap ci-map-marker-wrap--hub",
				html: hubIconHtml(data.location.city),
				iconSize: [120, 48],
				iconAnchor: [60, 44],
			}),
			keyboard: true,
			title: `${data.location.city} — primary focus`,
		})
			.addTo(map)
			.bindTooltip(hubTooltipHtml(data), { ...TOOLTIP_OPTS, offset: [0, -36] });

		if (hubMarker) layersRef.current.markers.push(hubMarker);

		const offsets = overlapOffsets(hub, located.map((l) => l.pos));
		located.forEach(({ evt, pos }, i) => {
			const [dx, dy] = offsets[i] ?? [0, 0];
			const marker = L.marker(pos, {
				icon: L.divIcon({
					className: "ci-map-marker-wrap",
					html: eventIconHtml(evt),
					iconSize: [36, 36],
					iconAnchor: [18 - dx, 18 - dy],
				}),
				keyboard: true,
				title: evt.title,
			})
				.addTo(map)
				.bindTooltip(eventTooltipHtml(evt), {
					...TOOLTIP_OPTS,
					offset: [0, -20],
				});

			marker.on("click", () => {
				map.flyTo(pos, Math.max(map.getZoom(), 7), { duration: 0.85 });
			});

			layersRef.current.markers.push(marker);
		});

		if (points.length === 1) {
			map.setView(points[0], 6);
		} else {
			map.fitBounds(bounds, { padding: [36, 36], maxZoom: 8, animate: false });
		}

		queueMicrotask(() => map.invalidateSize());
	}, [data, active, mapReady]);

	const hasHub = toLatLng(data.location) !== null;
	const locatedEvents = data.relatedEvents.filter((e) => toLatLng(e) !== null);
	const unplotted =
		(hasHub ? 0 : 1) + (data.relatedEvents.length - locatedEvents.length);
	const presentKinds = [...new Set(locatedEvents.map((e) => markerKind(e)))];

	const legend: { key: string; label: string; swatch?: { shape: "dot" | "diamond"; color: string } }[] = [];
	if (hasHub) {
		legend.push({ key: "hub", label: "Primary focus", swatch: { shape: "dot", color: "var(--accent-navy, #1a3a52)" } });
	}
	if (presentKinds.includes("strike")) {
		legend.push({ key: "strike", label: "Strike", swatch: { shape: "diamond", color: "#C2536A" } });
	}
	if (presentKinds.includes("affected")) {
		legend.push({ key: "affected", label: "Affected", swatch: { shape: "dot", color: "#E07B39" } });
	}
	if (presentKinds.includes("talks")) {
		legend.push({ key: "talks", label: "Diplomacy", swatch: { shape: "dot", color: "#4A9B8B" } });
	}
	if (unplotted > 0) {
		legend.push({
			key: "unplotted",
			label: `${unplotted} ${unplotted === 1 ? "place" : "places"} not shown: location unknown`,
		});
	}

	return (
		<div className="ci-map">
			<div
				className="ci-interactive-map"
				style={{
					position: "relative",
					width: "100%",
					aspectRatio: `${W} / ${H}`,
					minHeight: 300,
					maxHeight: 420,
				}}
			>
				<p className="sr-only">
					Map of the primary briefing location and related events. Every mapped
					event is also listed in the background timeline below.
				</p>

				<div
					ref={containerRef}
					className="ci-interactive-map__leaflet leaflet-container"
					style={{
						height: "100%",
						width: "100%",
						borderRadius: 0,
						zIndex: 1,
					}}
					role="application"
					aria-label="Interactive conflict map"
					tabIndex={0}
				/>
			</div>

			{/* The key sits under the map so it never covers it on a narrow screen. */}
			{legend.length > 0 && (
				<ul className="ci-map-legend" aria-label="Map key">
					{legend.map((item) => (
						<li key={item.key} className="ci-map-legend__item">
							{item.swatch ? (
								<span
									aria-hidden
									className={`ci-map-legend__swatch ci-map-legend__swatch--${item.swatch.shape}`}
									style={{ background: item.swatch.color }}
								/>
							) : null}
							{item.label}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
