import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type MapEvent = {
  lat: number;
  lng: number;
  type: 'strike' | 'city' | 'talks';
  name: string;
  desc: string;
};

type ConflictMapProps = {
  events: MapEvent[];
  sendPrompt: (message: string) => void;
};

const MARKER_COLORS: Record<MapEvent['type'], string> = {
  strike: '#C2536A',
  city: '#E07B39',
  talks: '#4A9B8B',
};

const MARKER_LABELS: Record<MapEvent['type'], string> = {
  strike: 'Strike',
  city: 'City',
  talks: 'Talks',
};

function makeMarkerHtml(type: MapEvent['type'], color: string) {
  const duration = '2.5s';
  const shapeByType: Record<MapEvent['type'], string> = {
    strike: `<path d="M20 9l-2.5 7h5l-2 14 7-12h-4.5l-1.5-9z" fill="${color}" />`,
    city: `<rect x="14" y="15" width="12" height="10" rx="1" fill="${color}" />`,
    talks: `<circle cx="20" cy="20" r="5" fill="${color}" />`,
  };
  const shape = shapeByType[type];
  return `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <style>
        .pulse-1 { animation: pulse ${duration} ease-out infinite; transform-origin: center; }
        .pulse-2 { animation: pulse ${duration} ease-out infinite 0.35s; transform-origin: center; }
        @keyframes pulse { 0% { transform: scale(0.6); opacity: 0.7; } 70% { opacity: 0.15; } 100% { transform: scale(1.6); opacity: 0; } }
      </style>
      <circle class="pulse-1" cx="20" cy="20" r="9" fill="none" stroke="${color}" stroke-width="2" />
      <circle class="pulse-2" cx="20" cy="20" r="9" fill="none" stroke="${color}" stroke-width="2" />
      ${shape}
    </svg>
  `;
}

function makeTooltipHtml(event: MapEvent) {
  return `
    <div class="ci-tip">
      <span class="ci-tip-type" style="color: ${MARKER_COLORS[event.type]};">${MARKER_LABELS[event.type]}</span>
      <span class="ci-tip-name">${event.name}</span>
      <span class="ci-tip-desc">${event.desc}</span>
    </div>
  `;
}

export function ConflictMap({ events, sendPrompt }: ConflictMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const tileUrl = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const map = L.map(containerRef.current, {
      center: [33.9, 43.6],
      zoom: 5,
      scrollWheelZoom: false,
      attributionControl: false,
      zoomControl: false,
    });

    L.tileLayer(tileUrl, {
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    events.forEach((event) => {
      const icon = L.divIcon({
        className: 'ci-map-marker',
        html: makeMarkerHtml(event.type, MARKER_COLORS[event.type]),
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([event.lat, event.lng], { icon, keyboard: false })
        .addTo(map)
        .bindTooltip(makeTooltipHtml(event), {
          direction: 'top',
          offset: [0, -18],
          className: 'ci-tip',
          opacity: 0.98,
          interactive: false,
        });

      marker.on('click', () => {
        map.flyTo([event.lat, event.lng], 6, { duration: 1.2 });
        sendPrompt(`Explain the significance of ${event.name} in the context of this topic.`);
      });

      markersRef.current.push(marker);
    });
  }, [events, sendPrompt]);

  return <div className="ci-map-container" ref={containerRef} aria-label="Conflict map" />;
}
