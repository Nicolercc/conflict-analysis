# Knowledge Nexus - Local Development Setup

## System Overview

**Knowledge Nexus** is a Conflict Intelligence System that uses AI to analyze conflict news articles and topics. It provides multi-perspective analysis, geopolitical context, and source verification.

### Architecture
- **Frontend**: React 19 + Vite (port 5173)
- **Backend API**: Express.js + TypeScript (port 3001)
- **AI Engine**: Anthropic Claude API (2-pass analysis)
- **Real-time Data**: GDELT News + Wikipedia

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+ (or compatible)
- pnpm (npm install -g pnpm)
- Valid Anthropic API key

### Step 1: Environment Setup ✅ Already Done
The `.env` file is configured with:
```
PORT=3001
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-api03-...  [YOUR KEY]
AI_INTEGRATIONS_ANTHROPIC_BASE_URL=https://api.anthropic.com
```

### Step 2: Start the Backend (Terminal 1)
```bash
# Starting API server on port 3001
pnpm run dev:api

# Expected output:
# 📊 Conflict Intelligence API
# ✅ Server listening on port 3001
# Ready to accept /api/analyze and /api/explore requests
```

### Step 3: Start the Frontend (Terminal 2)
```bash
# Starting Conflict Intelligence frontend on port 5173
pnpm run dev

# Expected output:
# VITE v7.3.1 dev server running at:
# > Local:   http://localhost:5173/
# > Proxy:   /api → http://localhost:3001
```

### Step 4: Open in Browser
Navigate to **http://localhost:5173**

---

## How It Works

### 3-Step Workflow

#### Input (You provide ONE of):
1. **Article URL** → Backend scrapes the URL and extracts text
2. **Paste Article Text** → Direct text input (min. 50 characters)
3. **Explore Topic** → Search a conflict topic (min. 3 characters)

#### Processing (Backend):
1. **Live Data Collection**
   - Fetches recent news from GDELT (Google Event Detection)
   - Pulls Wikipedia context for historical background

2. **Pass 1: AI Analysis** (Claude Haiku)
   - Extracts: location, actors, credibility score
   - Generates: perspectives, escalation risk, historical context
   - Maps: related events with coordinates

3. **Pass 2: Verification** (Claude Haiku)
   - Gets perspective from global media outlets
   - Identifies consensus in coverage
   - Detects divergence points (geopolitical fault lines)

#### Output (7 Visualization Panels):
1. **World Map** - Conflict location & related events
2. **Summary** - Typewriter effect headline
3. **Credibility Score** - Animated 0-100 gauge
4. **Escalation Meter** - Visual risk assessment
5. **Event Timeline** - Chronological context
6. **Casualty Panel** - Civilian impact data
7. **Verification Panel** - Multi-source coverage map
8. **Perspectives** - Actor alignments & interests
9. **Live Events** - Real GDELT news feed
10. **Source Diversity** - Global media breakdown

---

## API Endpoints

### /api/analyze (POST)
**Analyze a specific article**

Request:
```json
{
  "article": "Full article text (min. 50 chars)",
  "url": "https://example.com/article"  // OR url (not both)
}
```

Response:
```json
{
  "headline": "Russian assault kills 7 in Kyiv",
  "location": { "city": "Kyiv", "country": "Ukraine", "lat": 50.45, "lng": 30.52 },
  "credibility": { "score": 85, "label": "High", "reason": "..." },
  "perspectives": [...],
  "verification": { "sources": [...], "consensus": "...", "divergence": "..." },
  ...
}
```

### /api/explore (POST)
**Explore a conflict topic**

Request:
```json
{
  "topic": "Gaza conflict 2024"
}
```

Response: Same schema as /api/analyze

---

## Troubleshooting

### Frontend shows "Component Preview Server"
❌ Wrong app running. Make sure you ran:
```bash
pnpm run dev          # NOT dev:compose or other variants
```

### "Cannot GET /api/analyze"
❌ Backend not running. Start it in another terminal:
```bash
pnpm run dev:api
```

### API timeout errors
⚠️ Check external services:
- GDELT API: https://api.gdeltproject.org/
- Wikipedia API: https://en.wikipedia.org/

### "AI returned malformed response"
⚠️ Claude response parsing failed. Usually transient. Try again or:
- Check API key is valid
- Check Anthropic API status
- Check internet connection

### No CORS errors but API calls fail
✅ CORS is open (allow all origins in dev)
Check browser console → Network tab → inspect request

---

## Files Overview

```
📁 artifacts/
├── 📁 api-server/          ← Express.js backend
│   ├── src/
│   │   ├── app.ts          ← Express setup, CORS, logging
│   │   ├── routes/
│   │   │   └── intelligence.ts  ← /analyze & /explore endpoints
│   │   └── lib/
│   ├── .env                ← API key & port (dev only)
│   └── build.mjs           ← ESBuild config
│
└── 📁 conflict-intelligence/  ← React 19 frontend
    ├── src/
    │   ├── main.tsx        ← Entry point (sets API base URL)
    │   ├── App.tsx         ← Router setup
    │   ├── pages/
    │   │   └── Home.tsx    ← Main UI logic
    │   └── components/     ← 10+ visualization panels
    ├── vite.config.ts      ← Proxy config (/api → :3001)
    └── index.html
```

---

## Development Tips

### Enable Debug Logging
```bash
# Backend
DEBUG=* pnpm run dev:api
```

### View Live API Cache
The backend maintains in-memory cache (Map). Backend logs show cache hits:
```
INFO: ...  # Not cached
INFO: ...  # Next identical request returns cached result
```

### Test API Directly
```bash
curl -X POST http://localhost:3001/api/explore \
  -H "Content-Type: application/json" \
  -d '{"topic": "Yemen humanitarian crisis"}'
```

### Modify Test Article
Edit `artifacts/conflict-intelligence/src/pages/Home.tsx` line 18:
```typescript
const DEMO_ARTICLE = "...your test article...";
```

---

## Security Notes

✅ **What's Secured**:
- API key is server-only (never exposed to frontend)
- HTTP logs are sanitized (no tokens/keys logged)
- External requests have 12-second timeouts
- JSON parsing errors handled gracefully

⚠️ **What to Know**:
- CORS is fully open (dev mode only)
- No rate limiting (dev mode)
- .env contains secrets (already .gitignored)

---

## Performance

- **Cache**: In-memory Map (persists during server run)
- **Claude Latency**: ~3-5 seconds for full 2-pass analysis
- **Frontend Build**: ~1.3 seconds (Vite)
- **Backend Build**: ~110ms (esbuild)

---

## Next Steps

1. ✅ Both servers running locally?
2. ✅ Can see Conflict Intelligence UI?
3. ✅ Try pasting a real article?
4. ✅ Explore a conflict topic?

**If all works**: 🎉 You're set! The system is fully operational.

---

## Support

For issues:
1. Check backend logs: `pnpm run dev:api`
2. Check frontend console: F12 → Console
3. Verify .env has valid API key
4. Check network tab for failed requests
