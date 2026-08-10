# SYSTEM ARCHITECTURE & BUSINESS LOGIC

## High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser (Port 5173)                 │
│  Vantage — React 19 + Vite                                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Home Page                                               │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ Input: Article URL / Text / Topic                  │ │ │
│  │ │ 3 tabs: Article URL | Paste Text | Explore Topic   │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  │                     ↓ (setBaseUrl("/api"))              │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ useAnalyzeArticle / useExploreConflict hooks       │ │ │
│  │ │ → customFetch client (JSON request)               │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  │                     ↓ HTTP POST                          │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ Vite Proxy Dev Server                              │ │ │
│  │ │ /api/* → http://localhost:3001                     │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│              Express Backend (Port 3001)                     │
│         Anthropic Integration API Server                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ POST /api/analyze                                       │ │
│  │ - Accepts: article text OR url                          │ │
│  │ - Returns: structured intelligence brief               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ POST /api/explore                                       │ │
│  │ - Accepts: conflict topic (3+ chars)                   │ │
│  │ - Returns: structured intelligence brief               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Request Processing Pipeline:                            │ │
│  │ 1. Extract/Scrape article text                          │ │
│  │ 2. Fetch live GDELT news data                           │ │
│  │ 3. Fetch Wikipedia context                              │ │
│  │ 4. Check cache (SHA-256 key)                            │ │
│  │ 5. Call Claude Pass 1: Analysis                         │ │
│  │ 6. Call Claude Pass 2: Verification                     │ │
│  │ 7. Cache result                                          │ │
│  │ 8. Return JSON                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
    ↓ (for each request)     ↓           ↓
    │                        │           │
    ↓                        ↓           ↓
External APIs:
- GDELT API (news)         - Wikipedia API (context)      - Anthropic Claude API
  (news + dates)             (summaries, links)              (2-pass analysis+verify)
```

---

## Request/Response Flow

### /api/analyze Request
```json
{
  "article": "String 50+ chars of article text or news excerpt",
  "url": "https://example.com/news-article"  // optional, mutually exclusive with article
}
```

### /api/explore Request
```json
{
  "topic": "String 3+ characters identifying conflict (e.g., 'Gaza conflict', 'Yemen civil war')"
}
```

### Response (Both endpoints)
```json
{
  "headline": "String (8-10 words, factual)",
  "location": {
    "city": "String",
    "country": "String",
    "region": "String (e.g., Middle East, Sub-Saharan Africa)",
    "lat": 0.0,
    "lng": 0.0
  },
  "summary": "String (2-3 sentences, neutral multi-perspective framing)",
  "actors": ["String", "String"],  // 2-5 key parties
  "credibility": {
    "score": 0-100,
    "label": "Low|Medium|High",
    "reason": "String"
  },
  "perspectives": [
    {
      "actor": "String",
      "alignment": "Western|Regional|State Media|Civil Society|Affected Population",
      "framing": "String (1-2 sentences)",
      "interests": "String (1 sentence)"
    }
  ],  // 3-5 items, must include Regional + Affected Population
  "relatedEvents": [
    {
      "date": "String (Mon YYYY)",
      "title": "String",
      "description": "String (1 sentence)",
      "type": "strike|escalation|negotiation|humanitarian|political",
      "lat": 0.0,
      "lng": 0.0,
      "searchQuery": "String (Google News query)"
    }
  ],  // Exactly 3 items, chronological
  "escalationRisk": "Low|Medium|High",
  "escalationReason": "String",
  "historicalContext": "String (2-3 sentences with non-Western framing)",
  "affectedPopulation": "String with UN/WHO figures",
  "keyQuestion": "String",
  "casualtyData": {
    "description": "String (UN/WHO-sourced)",
    "civilianImpact": "String (2 sentences)",
    "allSides": "String (2 sentences)"
  },
  "liveEvents": [
    {
      "title": "String",
      "source": "String (news outlet domain)",
      "url": "String",
      "date": "String"
    }
  ],  // From GDELT API
  "verification": {
    "sources": [
      {
        "title": "String",
        "url": "String",
        "outlet": "String (Al Jazeera, The Hindu, etc)",
        "region": "Western|Middle East|Asia|Africa|Latin America|State Media",
        "summary": "String (1-2 sentences)"
      }
    ],  // 4-6 sources from 3+ regions
    "consensus": "String (2 sentences)",
    "divergence": "String (2 sentences)"
  },
  "sources": ["String", "String"]  // Domain names consulted
}
```

---

## Business Logic: 2-Pass Analysis

### Pass 1: Intelligence Analysis
**Purpose**: Generate structured geopolitical analysis
**Model**: Claude Haiku 4.5 (cost-optimized)
**Input**:
- Article text (user provided or scraped)
- GDELT live news context (last 8 articles)
- Wikipedia historical context

**Output**:
- Headline (8-10 words, factual)
- Location (city, country, region, coordinates)
- Credibility score (0-100) with reasoning
- Multi-perspective analysis (min 3 perspectives including Regional + Affected Population)
- Related events (3 items, chronological)
- Escalation risk assessment
- Historical context (2-3 sentences, non-Eurocentric)
- Casualty data (UN/WHO sourced)

**System Prompt Philosophy**:
> "You are a geopolitical research analyst. Your analysis is non-Eurocentric, non-US-centric, and rigorously multi-perspective. Center ALL affected populations equally — with particular attention to Middle Eastern, African, Asian, and Global South perspectives routinely underrepresented in Western media."

### Pass 2: Verification & Source Mapping
**Purpose**: Generate verification panel showing global media coverage
**Model**: Claude Haiku 4.5
**Input**:
- Complete intelligence brief from Pass 1
- Claude's knowledge of how global outlets cover conflicts

**Output**:
- 4-6 global news sources (Al Jazeera, The Hindu, Africa Report, teleSUR, CGTN, Xinhua, Dawn)
- "Consensus" section (what all outlets agree on)
- "Divergence" section (where coverage splits by geopolitical alignment)
- Realistic headlines from each outlet's perspective

---

## Caching Strategy

```
Article Input (text)
    ↓
SHA-256 Hash (full article text)
    ↓
Cache Key: `paste:{hex_hash}`
    ↓
Check in-memory Map (on app.locals.anthropicCache)
    ↓
If HIT: Return cached result (instant)
If MISS: Process article → Cache result → Return
    ↓
Cache persists for duration of backend server run
```

**Cache Hit Benefits**:
- Duplicate requests return in <10ms
- Zero Claude API cost for duplicate articles
- Same topic from multiple sources shares analysis

---

## Data Sources

### 1. GDELT (Global Event Detection Language)
**URL**: https://api.gdeltproject.org/api/v2/doc/doc
**Purpose**: Real-time global news events
**Usage**:
- Query: Recent news about conflict/topic
- Response: 8 latest articles with dates
- Injected into: liveEvents panel + context for Claude

### 2. Wikipedia
**URL**: https://en.wikipedia.org/api/rest_v1/page/summary
**Purpose**: Historical context & background
**Usage**:
- Query: Conflict topic search
- Response: 2000-char summary
- Injected into Claude Pass 1 for background

### 3. Anthropic Claude API
**URL**: https://api.anthropic.com/v1/messages
**Model**: claude-haiku-4-5-20251001 (cost optimized)
**Usage**:
- Pass 1: Full analysis (max 6000 tokens)
- Pass 2: Verification (max 2500 tokens)
- Both calls run in parallel with Promise.all()

---

## Error Handling Strategy

### Graceful Degradation
```
Request → Scrape/Fetch → Claude Pass 1 ← Success → Cache → Return
                            ↓ Error
                    Try Pass 2 (verification)
                            ↓ Error
                    Return stub verification
                    {
                      sources: [],
                      consensus: "Verification temporarily unavailable",
                      divergence: "Verification temporarily unavailable"
                    }
                    ← Return partial result, still useful
```

### HTTP Status Codes
- **200 OK**: Successful analysis/verification
- **400 Bad Request**:
  - Article too short (<50 chars)
  - Topic too short (<3 chars)
  - Missing required field (article/url or topic)
  - JSON parse error from Claude
- **500 Internal Server Error**:
  - Unexpected exception during processing
  - Invalid coordinates in response
  - GDELT/Wikipedia API failure (timeout, 500)

---

## Performance Metrics

| Operation | Time | Notes |
|-----------|------|-------|
| Article scrape (fetch + parse) | 1-3s | Depends on URL responsiveness |
| GDELT fetch | 0.5-1s | HTTP API to Google infrastructure |
| Wikipedia fetch | 0.5-1s | HTTP API to Wikimedia |
| Claude Pass 1 | 2-4s | Model inference + token generation |
| Claude Pass 2 | 1-2s | Smaller request, faster |
| Cache hit | <10ms | In-memory Map lookup |
| Frontend render | <500ms | React + chart libraries |

**Total Request**: 4-11 seconds (first request), <10ms (cached)

---

## Scalability & Limitations

### Current Constraints
- **Memory**: Unbounded cache (Map grows with requests)
- **Concurrency**: No queue/rate limiting (all requests processed immediately)
- **Persistence**: Cache lost on server restart
- **External Deps**: Dependent on GDELT/Wikipedia/Claude APIs uptime

### For Production
- Implement Redis cache (distributed + persistent)
- Add rate limiting (req/minute per IP)
- Add request queue with priority
- Monitor external API health
- Add telemetry & error tracking
- Implement API key rotation

---

## Security Considerations

### Input Validation
✅ Article text: min 50 chars
✅ URL: Basic HTTP/HTTPS validation
✅ Topic: min 3 chars
✅ All inputs: Sanitized before Claude prompt injection

### API Key Protection
✅ Stored in environment variable
✅ Never logged or exposed
✅ Only backend has access
✅ Frontend never sees API key

### External Requests
✅ 12-second timeout (prevents hanging)
✅ HTML scraping cleaned (scripts/styles removed)
✅ User-Agent spoofed (ConflictIntelBot)

### Logging
✅ HTTP method + URL (safe)
✅ Response status code
✅ NO request bodies (could contain article text)
✅ NO API keys or tokens

---

## Development vs Production

### Development
```
Frontend Dev Server (Vite):
- Hot reload on file changes
- Proxy: /api → http://localhost:3001
- Source maps enabled

Backend Dev Server (tsx):
- Auto-restart on file changes
- Full logging
- In-memory cache only
```

### Production
```
Frontend Build:
- Vite build output (static files)
- Served by CDN or static host
- VITE_API_BASE_URL=https://api.example.com

Backend Build:
- esbuild bundle (single index.mjs)
- Environment: NODE_ENV=production
- Redis cache + error monitoring
- Rate limiting + queue enabled
```

---

## Testing The System

### Manual Integration Test
```bash
# Terminal 1
pnpm run dev:api

# Terminal 2
pnpm run dev

# Browser: http://localhost:5173
# Try: Paste an article about Yemen
# Verify: See 7 visualization panels
```

### API Test via curl
```bash
curl -X POST http://localhost:3001/api/explore \
  -H "Content-Type: application/json" \
  -d '{"topic":"Sudan civil war"}' \
  | jq '.perspectives'
```

### Test Cache
```bash
# First request: takes 5-10 seconds
# Second identical request: instant
```
