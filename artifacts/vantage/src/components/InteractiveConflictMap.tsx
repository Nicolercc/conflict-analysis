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

function getTileUrl() {
	const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	if (dark) {
		return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
	}
	return "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
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
	'&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

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

		L.tileLayer(getTileUrl(), {
			maxZoom: 19,
			attribution: TILE_ATTR,
		}).addTo(map);

		mapRef.current = map;
		setMapReady(true);

		const ro = new ResizeObserver(() => {
			map.invalidateSize({ animate: false });
		});
		ro.observe(el);

		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const onScheme = () => {
			map.eachLayer((layer) => {
				if (layer instanceof L.TileLayer) {
					map.removeLayer(layer);
				}
			});
			L.tileLayer(getTileUrl(), {
				maxZoom: 19,
				attribution: TILE_ATTR,
			}).addTo(map);
		};
		mq.addEventListener("change", onScheme);

		return () => {
			mq.removeEventListener("change", onScheme);
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

		const hub: L.LatLngTuple = [data.location.lat, data.location.lng];
		const bounds = L.latLngBounds([hub]);

		const lineStyle: L.PolylineOptions = {
			color: "#8a9aaa",
			weight: 1.5,
			opacity: 0.55,
			dashArray: "6 8",
			lineCap: "round",
		};

		data.relatedEvents.forEach((evt) => {
			const dest: L.LatLngTuple = [evt.lat, evt.lng];
			bounds.extend(dest);
			const line = L.polyline([hub, dest], lineStyle).addTo(map);
			layersRef.current.polylines.push(line);
		});

		const hubMarker = L.marker(hub, {
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

		layersRef.current.markers.push(hubMarker);

		data.relatedEvents.forEach((evt) => {
			const pos: L.LatLngTuple = [evt.lat, evt.lng];
			const marker = L.marker(pos, {
				icon: L.divIcon({
					className: "ci-map-marker-wrap",
					html: eventIconHtml(evt),
					iconSize: [36, 36],
					iconAnchor: [18, 18],
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

		if (data.relatedEvents.length === 0) {
			map.setView(hub, 6);
		} else {
			map.fitBounds(bounds, { padding: [36, 36], maxZoom: 8, animate: false });
		}

		queueMicrotask(() => map.invalidateSize());
	}, [data, active, mapReady]);

	const presentKinds = [
		...new Set(data.relatedEvents.map((e) => markerKind(e))),
	];

	return (
		<div
			className="ci-interactive-map"
			style={{
				position: "relative",
				width: "100%",
				aspectRatio: `${W} / ${H}`,
				minHeight: 260,
				maxHeight: 420,
			}}
		>
			<div
				className="ci-map-overlay ci-map-overlay--interactive"
				style={{
					position: "absolute",
					top: 10,
					left: 12,
					right: 12,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					zIndex: 500,
					pointerEvents: "none",
					gap: 8,
				}}
			>
				<span className="ci-map-chip">Conflict map · geographic context</span>
				<div
					className="ci-map-legend-inline"
					style={{
						display: "flex",
						flexWrap: "wrap",
						justifyContent: "flex-end",
						gap: "8px 14px",
						maxWidth: "min(100%, 420px)",
					}}
				>
					<span className="ci-map-legend-inline__item">
						<span className="ci-map-legend-inline__dot ci-map-legend-inline__dot--hub" />
						Primary focus
					</span>
					{presentKinds.includes("strike") ? (
						<span className="ci-map-legend-inline__item">
							<span
								className="ci-map-legend-inline__diamond"
								style={{ background: "#C2536A" }}
							/>
							Strike
						</span>
					) : null}
					{presentKinds.includes("affected") ? (
						<span className="ci-map-legend-inline__item">
							<span
								className="ci-map-legend-inline__dot"
								style={{ background: "#E07B39" }}
							/>
							Affected
						</span>
					) : null}
					{presentKinds.includes("talks") ? (
						<span className="ci-map-legend-inline__item">
							<span
								className="ci-map-legend-inline__dot"
								style={{ background: "#4A9B8B" }}
							/>
							Diplomacy
						</span>
					) : null}
				</div>
			</div>

			<p
				className="ci-map-a11y-hint"
				style={{
					position: "absolute",
					width: 1,
					height: 1,
					overflow: "hidden",
					clip: "rect(0 0 0 0)",
				}}
			>
				Map shows the primary briefing location and related events. Hover
				markers for details; scroll or pinch to zoom.
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
	);
}
