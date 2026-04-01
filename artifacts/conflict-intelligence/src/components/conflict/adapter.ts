import type { IntelligenceBrief } from '@workspace/api-client-react';
import type { ConflictAnalysis, MapEventType, TimelineEventType } from './types';

const PARTY_COLORS = ['#3B78D4', '#4A9B8B', '#C2536A', '#E07B39', '#9B7BC8', '#888888'];
const PERSPECTIVE_COLORS = ['#3B78D4', '#C2536A', '#E07B39', '#9B7BC8', '#4A9B8B'];

const REGION_FLAGS: Record<string, string> = {
  Western: '🇺🇸',
  'Middle East': '🇶🇦',
  Asia: '🇮🇳',
  Africa: '🌍',
  'Latin America': '🇧🇷',
  'State Media': '📡',
};

function toMapEventType(type: string): MapEventType {
  if (type === 'negotiation') return 'talks';
  if (type === 'humanitarian' || type === 'political') return 'city';
  return 'strike';
}

function toTimelineType(type: string): TimelineEventType {
  if (type === 'strike' || type === 'escalation' || type === 'negotiation') {
    return type as TimelineEventType;
  }
  return 'escalation';
}

export function adaptBrief(brief: IntelligenceBrief): ConflictAnalysis {
  const sourceCount = brief.verification?.sources?.length ?? 0;

  return {
    title: brief.headline,
    location: `${brief.location.city}, ${brief.location.country}`,
    region: `${brief.location.region} · ${brief.location.city}`,
    publishedAt: new Date().toISOString(),
    summary: brief.summary,
    keyQuestion: brief.keyQuestion,
    credibilityScore: brief.credibility.score,
    credibilityTag: brief.credibility.reason,
    escalationLevel: brief.escalationRisk,
    escalationTag: brief.escalationReason,
    displacedCount: '—',
    displacedCountries: 0,
    parties: brief.actors.map((name, i) => ({
      name,
      color: PARTY_COLORS[i % PARTY_COLORS.length],
    })),
    timeline: brief.relatedEvents.map((e, i) => ({
      date: e.date,
      type: i === brief.relatedEvents.length - 1 ? 'now' : toTimelineType(e.type),
      title: e.title,
      subtitle: e.description,
      detail: e.description,
      lat: e.lat,
      lng: e.lng,
    })),
    perspectives: brief.perspectives.map((p, i) => ({
      label: p.alignment.replace(' ', '\u00A0'),
      actor: p.actor,
      color: PERSPECTIVE_COLORS[i % PERSPECTIVE_COLORS.length],
      quote: p.framing,
      interest: p.interests,
    })),
    sources:
      sourceCount > 0
        ? brief.verification.sources.map((s) => ({
            name: s.outlet,
            flag: REGION_FLAGS[s.region] ?? '🌐',
            region: s.region,
            summary: s.summary,
          }))
        : [],
    mapEvents: [
      {
        lat: brief.location.lat,
        lng: brief.location.lng,
        type: 'strike',
        name: brief.location.city,
        desc: brief.headline,
      },
      ...brief.relatedEvents.map((e) => ({
        lat: e.lat,
        lng: e.lng,
        type: toMapEventType(e.type),
        name: e.title.split(' ').slice(0, 2).join(' '),
        desc: e.description,
      })),
    ],
    consensus: {
      agree: brief.verification?.consensus ?? '—',
      diverge: brief.verification?.divergence ?? '—',
    },
    historicalContext: brief.historicalContext,
    credit: 'Claude (Anthropic) + GDELT Live News',
  };
}
