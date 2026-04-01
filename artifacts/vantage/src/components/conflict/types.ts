export type EscalationLevel = 'Low' | 'Medium' | 'High';
export type TimelineEventType = 'strike' | 'escalation' | 'negotiation' | 'now';
export type MapEventType = 'strike' | 'city' | 'talks';

export interface ConflictAnalysis {
  title: string;
  location: string;
  region: string;
  publishedAt: string;
  summary: string;
  keyQuestion: string;
  credibilityScore: number;
  credibilityTag: string;
  escalationLevel: EscalationLevel;
  escalationTag: string;
  displacedCount: string;
  displacedCountries: number;
  /** When API has no headcount, narrative from affectedPopulation / casualtyData fills the card. */
  displacedNarrative: string;
  parties: Party[];
  timeline: TimelineEvent[];
  perspectives: PerspectiveItem[];
  sources: SourceItem[];
  mapEvents: MapEvent[];
  consensus: Consensus;
  historicalContext: string;
  credit: string;
}

export interface Party {
  name: string;
  color: string;
}

export interface TimelineEvent {
  date: string;
  type: TimelineEventType;
  title: string;
  subtitle: string;
  detail: string;
  lat: number;
  lng: number;
}

export interface PerspectiveItem {
  label: string;
  actor: string;
  color: string;
  quote: string;
  interest: string;
}

export interface SourceItem {
  name: string;
  flag: string;
  region: string;
  summary: string;
}

export interface MapEvent {
  lat: number;
  lng: number;
  type: MapEventType;
  name: string;
  desc: string;
}

export interface Consensus {
  agree: string;
  diverge: string;
}
