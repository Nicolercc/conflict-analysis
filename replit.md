# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Anthropic Claude (via Replit AI Integrations, `claude-sonnet-4-6`)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── vantage/  # Vantage (React + Vite)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-anthropic-ai/  # Anthropic AI integration client
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Applications

### Vantage (`artifacts/vantage`)

A war-room style globally-balanced geopolitical intelligence terminal. Two input modes:
1. **Paste Article** — paste any conflict news article for instant AI analysis
2. **Explore Conflict** — type any conflict/war/crisis topic for a comprehensive deep-dive

**Output panels**:
- Animated SVG world map with main incident marker + 5 historical event markers
- AI-generated intelligence brief (typewriter effect)
- Credibility scoring (animated counter, 0-100, with diverse source check)
- Escalation risk meter (Low/Medium/High with animated fill bars)
- **Casualty data panel** — UN/WHO-sourced casualty estimates from all sides
- **Regional perspectives** — 4 panels showing how different world regions view the conflict (2+ non-Western required)
- **Live events feed** — real-time news pulled from GDELT (free, no API key needed)
- **Historical context** — Wikipedia-sourced background with colonial/political roots
- **Conflict timeline** — 5 real historical events spanning full conflict arc

**Design principle**: Explicitly non-US/non-Eurocentric — AI prompt mandates equal coverage of Middle Eastern, African, Asian, and Global South perspectives. Civilian casualties documented from ALL parties.

**Live data sources**: GDELT (gdeltproject.org) for real-time news, Wikipedia REST API for historical context
**Tech**: React + Vite, Tailwind, custom SVG map, Anthropic Claude AI (claude-sonnet-4-6)
**Preview path**: `/`
**Design v2.0**: Editorial warm cream (#F7F4EF) background, white cards, Playfair Display headings, Source Serif 4 body, IBM Plex Mono labels. No dark panels. CSS variables: --bg-primary, --bg-surface, --accent-navy, --risk-high/medium/low, --region-western/mideast/asia/africa/latam/state.

**New in v2.0**:
- `VerificationPanel` — multi-source grid cross-referencing global outlets (via Claude 2nd pass)
- `SourceDiversity` — segmented bar showing geographic distribution of sources
- `PerspectivesPanel` — uses `Perspective` schema (`actor/alignment/framing/interests`)
- Full editorial layout: breadcrumb → brief header (region chip + headline + actor chips) → map → two-column summary/scores → perspectives → verification + source diversity → timeline → live news footer
- Two-pass Claude: main analysis (6000 tokens) + verification pass (2500 tokens, non-blocking)
- URL scraper: HTML regex extraction for any public URL
- SiteHeader in LiveTicker.tsx (slim 56px fixed header, no ticker)

### API Server (`artifacts/api-server`)

Express 5 API server. Routes at `/api`.

**Endpoints**:
- `GET /api/healthz` — health check
- `POST /api/intelligence/analyze` — paste article analysis (fetches GDELT + Wikipedia context, then Claude analysis)
- `POST /api/intelligence/explore` — topic-based conflict exploration (same pipeline, no article required)

Before calling Claude, both endpoints:
1. Search GDELT for recent real news matching the conflict location/topic
2. Fetch Wikipedia summary for historical background
3. Pass all real context into Claude's system prompt for grounded analysis

Returns enriched `IntelligenceBrief` with: location, credibility, escalationRisk, casualtyData, perspectives (4 regions), liveEvents (real GDELT), conflictBackground (Wikipedia), relatedEvents (5 historical), sources.

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## API Contract

The OpenAPI spec lives in `lib/api-spec/openapi.yaml`. After changes, run:
```bash
pnpm --filter @workspace/api-spec run codegen
```

This regenerates:
- `lib/api-client-react/src/generated/` — React Query hooks
- `lib/api-zod/src/generated/` — Zod schemas

## Environment Variables

- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Auto-set by Replit AI Integrations
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Auto-set by Replit AI Integrations
- `SESSION_SECRET` — Set in Replit Secrets
- `DATABASE_URL` — Set if database is provisioned
