export type EscalationLevel = 'Low' | 'Medium' | 'High';
export type TimelineEventType = 'strike' | 'escalation' | 'negotiation' | 'now';
export type MapEventType = 'strike' | 'city' | 'talks';

export interface ConflictAnalysis {
  title: string;
  location: string;
  region: string;
  /** Server generation time (ISO 8601). Never the time the page was opened. */
  publishedAt: string;
  summary: string;
  keyQuestion: string;
  escalationLevel: EscalationLevel;
  escalationTag: string;
  /** Counts of articles actually returned by retrieval. */
  coverage: Coverage;
  parties: Party[];
  timeline: TimelineEvent[];
  perspectives: PerspectiveItem[];
  mapEvents: MapEvent[];
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
  lat: number | null;
  lng: number | null;
}

export interface PerspectiveItem {
  label: string;
  actor: string;
  color: string;
  quote: string;
  interest: string;
}

export interface Coverage {
  articles: number;
  outlets: number;
  countries: number;
}

export interface MapEvent {
  lat: number;
  lng: number;
  type: MapEventType;
  name: string;
  desc: string;
}
