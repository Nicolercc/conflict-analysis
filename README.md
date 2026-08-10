# Vantage

### AI-Powered Conflict Intelligence & Geopolitical Analysis

**Vantage transforms news articles and conflict topics into structured, interactive intelligence briefs using live news data, historical context, and multi-stage AI analysis.**

Users can paste an article, submit a URL, or explore a geopolitical conflict directly. Vantage enriches the request with current global reporting and historical context, analyzes it through a structured AI pipeline, and presents the result as an interactive intelligence dashboard.

**Built end-to-end by Nicole Rodriguez as a full-stack applied AI engineering project.**

[Live Demo](https://conflict-analysis-vantage.vercel.app) · [Architecture](./ARCHITECTURE.md)

---

## Why I Built Vantage

Following an international conflict often means piecing together information scattered across breaking-news reports, historical references, casualty figures, maps, and competing political narratives.

The engineering challenge behind Vantage was:

> **How can a system turn fragmented conflict information into a structured, explorable brief without reducing a complex geopolitical event to a single narrative?**

I designed Vantage as a full-stack intelligence pipeline that combines live external data, historical context, structured LLM analysis, and interactive visualization.

The project gave me an opportunity to work across the complete product lifecycle: system architecture, API design, AI orchestration, unreliable-output handling, frontend visualization, caching, deployment, and production-oriented failure states.

---

# What Vantage Does

Vantage accepts three forms of input:

* **Article URL** — fetches and extracts article text
* **Pasted article text** — analyzes user-provided reporting directly
* **Conflict topic** — explores a geopolitical issue without requiring an article

The system produces a structured intelligence brief containing:

* geographic location and interactive map context
* key state and non-state actors
* conflict summary
* competing political and civilian perspectives
* credibility assessment
* historical context
* escalation-risk analysis
* affected-population context
* related events
* current reporting from GDELT
* cross-regional media framing
* consensus and divergence analysis

---

# System Architecture

```text
                         ┌────────────────────┐
                         │       User         │
                         │ URL / Text / Topic │
                         └─────────┬──────────┘
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │   React + TypeScript    │
                    │     Vantage Client      │
                    └────────────┬────────────┘
                                 │
                                 │ HTTP
                                 ▼
                    ┌─────────────────────────┐
                    │      Express API        │
                    │      TypeScript         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
             ┌──────────────┐          ┌──────────────┐
             │    GDELT     │          │  Wikipedia   │
             │  Live News   │          │   Context    │
             └──────┬───────┘          └──────┬───────┘
                    │                         │
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   Claude Analysis Pass  │
                    │ Structured Intelligence │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ Validation + Normalize  │
                    │ JSON / Maps / Metadata  │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ Perspective-Mapping Pass│
                    │ Consensus / Divergence  │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ SHA-256 Request Cache   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ Interactive Intelligence│
                    │       Dashboard         │
                    └─────────────────────────┘
```

---

# Engineering Highlights

## 1. Multi-Source Context Pipeline

Rather than sending raw user input directly to an LLM, Vantage builds additional context first.

For each analysis, the backend concurrently retrieves:

* **GDELT** — recent global news coverage
* **Wikipedia** — historical and geopolitical background

The retrieved context is then incorporated into the analysis request.

```ts
const [liveNews, wikiSummary] = await Promise.all([
  fetchGdeltNews(topic),
  fetchWikipediaSummary(topic),
]);
```

Parallelizing independent network calls reduces unnecessary request latency while keeping the orchestration logic simple.

---

## 2. Structured AI Analysis

The primary Claude pass converts unstructured conflict information into a defined intelligence schema.

Instead of requesting free-form prose, Vantage constrains the model toward structured fields including:

```text
headline
location
summary
actors
credibility
perspectives
relatedEvents
escalationRisk
historicalContext
affectedPopulation
casualtyData
sources
```

This makes AI output directly consumable by application components instead of treating the model response as a block of text.

---

## 3. Defensive LLM Output Handling

LLM output is probabilistic, even when a model is instructed to return JSON.

Vantage therefore includes defensive parsing for responses containing:

* Markdown code fences
* text before or after JSON
* nested objects and arrays
* escaped strings
* malformed responses

The API attempts structured extraction and a secondary fallback strategy before failing the request.

Coordinates generated by the model are also normalized and range-checked before reaching the map interface.

```text
Latitude  → -90 ... 90
Longitude → -180 ... 180
```

This prevents unreliable model output from cascading directly into the presentation layer.

---

## 4. Live Data + Generated Analysis Separation

Current news displayed by Vantage comes directly from **GDELT retrieval**, rather than being generated by the model.

The architecture separates:

```text
Retrieved information
        ↓
GDELT + Wikipedia

Generated analysis
        ↓
Claude

Application normalization
        ↓
TypeScript API

Presentation
        ↓
React dashboard
```

Keeping these responsibilities separate makes it easier to reason about where information originates and where additional verification is needed.

---

## 5. Graceful Degradation

The secondary perspective-mapping stage is deliberately **non-blocking**.

If it fails, Vantage can still return the primary intelligence brief rather than failing the entire request.

```ts
try {
  // secondary analysis
} catch {
  parsed.verification = {
    sources: [],
    consensus: "Verification temporarily unavailable.",
    divergence: "Verification temporarily unavailable.",
  };
}
```

This was an intentional reliability decision: optional enrichment should not make the core product unavailable.

---

## 6. Request Caching

Repeated AI requests are expensive and unnecessary.

For pasted articles, Vantage generates a SHA-256 hash of the normalized article text:

```text
Article
   ↓
SHA-256
   ↓
paste:<hash>
   ↓
In-memory cache
```

Identical requests can therefore bypass external AI processing and immediately reuse the previous analysis.

The current implementation uses an in-memory `Map`; a distributed cache such as Redis would be the natural production evolution.

---

## 7. Article Extraction

URL-based analysis includes a backend article-extraction pipeline that:

* fetches the supplied page
* enforces a network timeout
* removes scripts and styles
* removes common navigation/layout elements
* strips remaining HTML
* normalizes whitespace
* validates extracted-content length
* limits the amount of text passed downstream

If extraction fails, the interface can fall back to pasted article text.

---

# API

The backend exposes the intelligence engine through an Express API.

### Analyze an article

```http
POST /api/intelligence/analyze
```

```json
{
  "article": "Article text..."
}
```

or:

```json
{
  "url": "https://example.com/article"
}
```

### Explore a conflict

```http
POST /api/intelligence/explore
```

```json
{
  "topic": "Sudan civil war"
}
```

### Health check

```http
GET /api/healthz
```

---

# Reliability & Operational Design

Vantage includes several production-oriented safeguards beyond the core feature set:

**External request timeouts**

Third-party requests use bounded timeouts so unavailable services do not hang requests indefinitely.

**Input validation**

Article and topic requests are validated before entering the expensive analysis pipeline.

**Structured logging**

The Express API uses Pino-based HTTP logging while avoiding logging article bodies or API credentials.

**Health checks**

A dedicated health endpoint allows deployment infrastructure to confirm API availability.

**Graceful shutdown**

`SIGTERM` and `SIGINT` handlers close the HTTP server cleanly before process termination.

**Environment isolation**

Anthropic credentials remain server-side and are supplied through environment variables rather than exposed to the browser.

---

# Frontend

The Vantage interface is built as a high-density analytical dashboard rather than a conversational chatbot.

The frontend uses:

* React
* TypeScript
* Vite
* TanStack Query
* Leaflet
* Recharts
* Radix UI
* Tailwind CSS
* Framer Motion

The UI translates the structured API response into dedicated visual surfaces for geography, timelines, actors, risk, perspectives, and source context.

---

# Backend

The API layer uses:

* Node.js
* TypeScript
* Express 5
* Anthropic Claude API
* GDELT API
* Wikipedia API
* Pino
* esbuild

The backend owns external-data retrieval, prompt orchestration, parsing, normalization, caching, validation, and failure handling.

---

# Repository Structure

```text
conflict-analysis/
│
├── artifacts/
│   ├── vantage/              # React visualization application
│   └── api-server/           # Express intelligence API
│
├── lib/                      # Shared workspace packages
├── scripts/                  # Development/build utilities
├── .github/workflows/        # CI workflows
│
├── ARCHITECTURE.md           # System architecture & business logic
├── LOCAL_SETUP.md            # Local development documentation
├── Dockerfile                # Production API container
├── pnpm-workspace.yaml       # Monorepo workspace configuration
└── package.json              # Root build + workspace scripts
```

---

# Tech Stack

| Layer               | Technology         |
| ------------------- | ------------------ |
| Language            | TypeScript         |
| Frontend            | React 19, Vite     |
| API                 | Node.js, Express 5 |
| AI                  | Anthropic Claude   |
| Live News           | GDELT              |
| Historical Context  | Wikipedia API      |
| Data Fetching       | TanStack Query     |
| Maps                | Leaflet            |
| Visualization       | Recharts           |
| Logging             | Pino               |
| Build               | esbuild            |
| Package Management  | pnpm workspaces    |
| Containerization    | Docker             |
| Frontend Deployment | Vercel             |

---

# Running Locally

## Requirements

* **Node.js 22+**
* **pnpm 9.9.0**
* Anthropic API key

Clone the repository:

```bash
git clone https://github.com/Nicolercc/conflict-analysis.git
cd conflict-analysis
```

Install dependencies:

```bash
pnpm install
```

Configure environment variables:

```bash
cp .env.example .env
```

Start the backend:

```bash
pnpm dev:api
```

Start the frontend:

```bash
pnpm dev
```

Frontend:

```text
http://localhost:5173
```

API:

```text
http://localhost:3001
```

---

# Docker

Build the production API image:

```bash
docker build -t vantage-api .
```

Run it:

```bash
docker run \
  --rm \
  -p 3001:3001 \
  --env-file .env \
  vantage-api
```

The production image uses a multi-stage Node 22 build and runs the application as a non-root user.

---

# Current Tradeoffs & Next Steps

Vantage is a working product, but several architectural improvements would be required before treating the platform as a high-trust production intelligence system.

### Source-backed verification

The current secondary analysis pass performs **perspective mapping**, using the model to reason about how coverage may differ across regions.

A stronger production implementation would retrieve every cited source directly, preserve provenance, and restrict claims to evidence available in those retrieved documents.

### Persistent caching

The current in-memory cache is fast and simple but disappears when the API process restarts.

A production implementation would use Redis or another distributed cache with explicit TTL and invalidation policies.

### Rate limiting and request queues

AI inference is comparatively expensive. Production traffic would require:

* per-client rate limits
* concurrency controls
* request queues
* retry policies
* cost and token telemetry

### Stronger schema enforcement

Model responses are currently defensively parsed and normalized.

A future iteration would add stricter runtime schema validation and automated repair/retry strategies around invalid model responses.

### Observability

A larger deployment would add:

* distributed request tracing
* external API latency metrics
* model latency/token metrics
* structured error monitoring
* cache hit-rate monitoring

These are deliberate next steps rather than abstractions added before the system needs them.

---

# What I Learned

Building Vantage pushed me beyond implementing individual frontend or backend features.

The project required me to reason about an entire system:

* where retrieved data ends and generated information begins
* how to structure nondeterministic AI output for deterministic software
* how failures in optional dependencies should affect the user
* when requests can execute concurrently
* how caching changes latency and API cost
* how to protect backend credentials
* how frontend data requirements influence API design
* and how to communicate technical limitations honestly in an AI product

Vantage is ultimately both a geopolitical-analysis product and an exploration of a broader software engineering problem:

> **How do you build reliable application systems around inherently probabilistic models?**

---

## Author

**Nicole Rodriguez**
Software Engineer

[Portfolio](https://nicolerodriguez.dev) · [GitHub](https://github.com/Nicolercc)
