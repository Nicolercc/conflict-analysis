# Vantage

### AI-Powered Conflict Intelligence & Geopolitical Analysis

**Vantage turns a conflict topic or a news article into a structured brief whose key facts link back to the reporting they came from.**

Readers can search a topic, submit an article link, or paste article text. Vantage retrieves current coverage from news outlets in several countries, asks Claude to brief it, and keeps only the claims it can tie to a retrieved source. Everything the model adds from background knowledge is labelled as such.

**Built end-to-end by Nicole Rodriguez as a full-stack applied AI engineering project.**

[Live Demo](https://conflict-analysis-vantage.vercel.app)

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

* **Topic** — a conflict, crisis or country, e.g. "Sudan" or "Red Sea shipping tensions"
* **Article link** — the public page is fetched and briefed
* **Pasted article text** — briefed directly; the text stays in the browser tab and out of the page address

Each brief contains two clearly separated kinds of content.

**Sourced, with numbered citations**

* key facts, each citing the retrieved sources that state it
* a coverage comparison: where outlets agree and where their framing differs
* the source list itself: publisher, country, date, link and the publisher's summary

**Model background, labelled as unsourced**

* summary, actors and competing perspectives
* background timeline and historical context
* escalation assessment and affected-population context
* an interactive map of the places involved

---

# System Architecture

```text
            Topic / article link / pasted text
                          │
                          ▼
              React + TypeScript client
                          │  HTTP
                          ▼
   ┌──────────────── Express API ────────────────┐
   │ validate input · rate limit · dedupe · cache │
   └──────────────────────┬──────────────────────┘
                          ▼
        Retrieval (all providers concurrently)
   19 publisher RSS feeds · news search · Wikipedia · reader's article
                          │
                          ▼
     Select: match topic · dedupe · cap per outlet ·
             spread across countries · assign ids
                          │
                          ▼
     Claude — fixed system prompt; sources in the user turn
                          │
                          ▼
     Check: schema · every cited id was retrieved ·
            figures appear in the cited text
                          │
                          ▼
            Brief with numbered citations
```

---

# Engineering Highlights

## 1. Sources come from retrieval, never from the model

A source record — publisher, URL, date, country — can only be created by the retrieval layer. The model refers to sources by id (`S1`, `S2`…) and anything it writes into a `sources`, `url` or date field is discarded.

Providers are queried concurrently and report their own outcome (`ok`, `empty`, `failed`), so a slow or unavailable provider neither blocks the brief nor silently looks like "no coverage".

```ts
const [search, wiki, ...feeds] = await Promise.all([
  searchNews(topic),
  searchWikipedia(topic),
  ...FEEDS.map((feed) => searchFeed(feed, topic)),
]);
```

## 2. Claims are checked before they are shown

The model returns key facts and a coverage comparison, each citing source ids. The server drops a claim when:

* a cited id was never retrieved
* a figure in the claim does not appear in the cited text
* the claim shares no vocabulary with an English-language source it cites

These checks are deterministic and cheap. They catch invented citations and invented numbers; they do not prove a claim is a fair summary. That needs a reviewed evaluation set, which is the next step below.

## 3. Unknown stays unknown

* Map coordinates come from a geocoder, not the model. The model names a place and gives its own estimate; a pin is drawn only when the looked-up place and the estimate agree. A vague name, a country-sized answer, a failed lookup or a disagreement leaves the place off the map — there is no default point.
* Dates come from the provider; when it gives none, the date is `null`.
* The generation time is stamped by the server once and survives caching, so an old brief never looks new.

## 4. Retrieved text cannot act as instructions

The system prompt is a constant. Retrieved headlines and the reader's article travel in the user turn inside labelled `<source>` blocks, with markup stripped so a source cannot close its own block. A test feeds an article containing "ignore all previous instructions" and asserts it never reaches the system prompt.

## 5. Contract-first API

`lib/api-spec/openapi.yaml` is the source of truth. The React Query client and Zod schemas are generated from it, CI fails if generated code drifts, and the server validates both request bodies and the model's brief against the same schemas. An incomplete brief gets one retry, then a typed error — never a 200 the UI crashes on.

## 6. Protecting an expensive public endpoint

* **Guarded fetching** for article links: http(s) only, default ports, private and reserved addresses refused at connect time and on every redirect, size-capped.
* **Per-client rate limit**, a **concurrency cap** and a **daily generation budget**.
* **In-flight dedupe**: identical concurrent requests share one generation.
* **Bounded cache** with a TTL that never stores failures.
* **Typed errors** with a stable code, a safe message and a request id; upstream provider messages are logged, never returned.

* **Response headers**: the site sends a content-security policy that allows only its own scripts, its fonts, map tiles and the API; the API sends `default-src 'none'`, no-sniff and HSTS.
* **Hard deadline on the model call**: one attempt, 60 seconds, so a reader gets an answer or a "try again", never a silent wait.

### Watching production

A scheduled workflow (`.github/workflows/uptime.yml`) requests the API's health check and the site every ten minutes; a failure emails the repository owner. Each brief logs its token use, source count and how many claims survived the checks, and every failure logs its code with the request id shown to the reader.

## 7. Accessible by default

Nothing is hidden behind hover. Pages have titles, a status region, ordered headings and managed focus; text is at least 11px and meets 4.5:1 contrast; pinch zoom works; reduced motion is respected.

---

# API

```http
POST /api/intelligence/stream      { "topic": "…" } | { "url": "https://…" } | { "article": "…" }
                                   → text/event-stream: stage, sources, then brief (or error)
POST /api/intelligence/explore     { "topic": "Sudan civil war" }
POST /api/intelligence/analyze     { "article": "Article text…" }  or  { "url": "https://…" }
GET  /api/briefs/{id}              a saved brief, exactly as first generated
GET  /api/healthz
```

Errors share one shape:

```json
{ "error": "RATE_LIMITED", "message": "Too many requests. Please wait a few minutes and try again.", "requestId": "…" }
```

Codes: `INVALID_INPUT`, `FETCH_BLOCKED`, `FETCH_FAILED`, `RATE_LIMITED`, `OVERLOADED`, `PROVIDER_UNAVAILABLE`, `MODEL_OUTPUT_INVALID`, `INTERNAL`.

---

# Testing

```bash
pnpm test        # API and frontend unit/route tests
pnpm typecheck
pnpm codegen     # regenerate client and schemas from the OpenAPI spec
```

Route tests run the real Express app against a fake model and fake retrieval, so they need no network and no API key. Each defect found in the project's audit was first captured as a failing test.

## Evaluation

`artifacts/api-server/eval` measures brief quality in two ways: a hand-labelled claim set that runs in CI, and 16 recorded topics replayed through the real pipeline and graded by a second model. The latest results are in [`eval/REPORT.md`](artifacts/api-server/eval/REPORT.md); how to run it is in [`eval/README.md`](artifacts/api-server/eval/README.md).

---

# Repository Structure

```text
conflict-analysis/
├── artifacts/
│   ├── vantage/              # React client
│   └── api-server/           # Express API
│       └── src/brief/        # retrieval, prompt, generation, claim checks
├── lib/
│   ├── api-spec/             # OpenAPI contract + codegen config
│   ├── api-zod/              # generated Zod schemas
│   ├── api-client-react/     # generated React Query client
│   └── integrations-anthropic-ai/
├── .github/workflows/        # CI: codegen drift, typecheck, build, tests
├── Dockerfile                # production API image
├── render.yaml               # Render API blueprint
└── pnpm-workspace.yaml
```

---

# Tech Stack

| Layer              | Technology                                   |
| ------------------ | -------------------------------------------- |
| Language           | TypeScript                                   |
| Frontend           | React 19, Vite, TanStack Query, Tailwind CSS |
| Maps               | Leaflet, OpenStreetMap tiles                 |
| API                | Node.js 22, Express 5, Zod                   |
| AI                 | Anthropic Claude                             |
| News retrieval     | Publisher RSS feeds, Bing News search        |
| Geocoding          | OpenStreetMap Nominatim                      |
| Background         | Wikipedia API                                |
| Contract           | OpenAPI + Orval code generation              |
| Testing            | Vitest, Supertest                            |
| Logging            | Pino                                         |
| Package management | pnpm workspaces                              |
| Deployment         | Vercel (client), Docker image (API)          |

---

# Running Locally

Requirements: **Node.js 22+**, **pnpm 9.9.0**, an Anthropic API key.

```bash
git clone https://github.com/Nicolercc/conflict-analysis.git
cd conflict-analysis
pnpm install
cp .env.example .env      # add your API key
pnpm dev:api              # API on http://localhost:3001
pnpm dev                  # client on http://localhost:5173
```

`.env.example` documents the optional limits (rate limit, daily budget, cache TTL, allowed origins).

## Docker

```bash
docker build -t vantage-api .
docker run --rm -p 3001:3001 --env-file .env vantage-api
```

## Deploying the API on Render

The API is deployed as a Docker web service. `render.yaml` lives at the repo root
so Render can create or update the service from a Blueprint.

1. Create a Render Blueprint from this repository.
2. When Render asks for unsynced secrets, set
   `AI_INTEGRATIONS_ANTHROPIC_API_KEY` to a workspace-scoped Anthropic API key.
3. Leave `PORT` unset in Render; the platform supplies it and the server binds to
   `0.0.0.0`.
4. Keep `CORS_ORIGINS` set to the Vercel frontend origin:
   `https://conflict-analysis-vantage.vercel.app`.
5. Set the Vercel frontend build env var
   `VITE_API_BASE_URL=https://conflict-analysis.onrender.com`, then redeploy the
   frontend so browser requests go to the Render API.

Render checks `/api/healthz`, which returns a small JSON status response.

---

# Current Limits & Next Steps

Vantage is honest about what it can and cannot support today.

### Headlines and summaries, not full articles

RSS feeds and the news search supply a headline and a short summary. Claims are therefore checked against that text, not the full article. Retrieving permitted full text is the next evidence step.

### A feed is a window, not an archive

Publisher feeds hold only recent items, so a quieter conflict relies on the news search for coverage. The search uses a public results feed with no service agreement behind it, and it does not report an outlet's country; a licensed news API would be the dependable replacement. The brief says how many providers were checked and how many had something.

### Claim checks are necessary, not sufficient

The deterministic checks stop invented citations and figures, and catch 6 of the 10 unsupported claims in the labelled set. They cannot tell when a claim's words match its source but its meaning does not. In the recorded evaluation a second model judges about half of kept claims fully supported and most of the rest as adding a detail the cited text lacks; the expected-fact lists it uses still need review by a person.

### Rate limits live in memory

Briefs are saved (in Postgres when `DATABASE_URL` is set) and each has a permanent `/brief/<id>` link, so a restart no longer loses them or regenerates them. The rate limits and the daily budget still live in the API process: they reset on restart and would not be shared between two instances.

### Progress is streamed; the text is not

While a brief is built the reader sees each step and the sources that were found. The brief itself still arrives whole, because its claims are checked against the sources before anything is shown; streaming checked sections one at a time is the next step.

### Saved briefs are kept indefinitely

There is no retention period or deletion route yet. A saved brief never contains the reader's pasted text, only the brief written from it.

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
