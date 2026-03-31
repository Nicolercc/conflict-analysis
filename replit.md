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
│   └── conflict-intelligence/  # Conflict Intelligence System (React + Vite)
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

### Conflict Intelligence System (`artifacts/conflict-intelligence`)

A war-room style geopolitical intelligence terminal. Users paste conflict news articles and receive:
- Animated SVG world map with strike markers and historical event correlations
- AI-generated intelligence brief (typewriter effect)
- Credibility scoring (animated counter, 0-100)
- Escalation risk meter (Low/Medium/High with animated fill bars)
- Historical event timeline with staggered card animations

**Tech**: React + Vite, Tailwind, custom SVG map, Anthropic Claude AI
**Preview path**: `/`
**Features**: Cormorant Garamond + DM Mono typography, dark terminal aesthetic (#010a03 background)

### API Server (`artifacts/api-server`)

Express 5 API server. Routes at `/api`.

**Endpoints**:
- `GET /api/healthz` — health check
- `POST /api/intelligence/analyze` — AI article analysis (returns IntelligenceBrief JSON)

The analyze endpoint calls Anthropic Claude (`claude-sonnet-4-6`) with a conflict-intelligence system prompt and returns structured JSON with location, credibility score, escalation risk, and 3 historically-correlated related events.

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
