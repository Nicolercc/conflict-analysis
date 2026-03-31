import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are a conflict intelligence analyst. Analyze the provided news article about a geopolitical conflict, military strike, or security incident.

Return ONLY valid JSON — no markdown fences, no preamble, no explanation. Strictly follow this schema:

{
  "headline": "string (8-10 words capturing the main event)",
  "location": {
    "city": "string",
    "country": "string",
    "lat": number (decimal degrees, must be -90 to 90),
    "lng": number (decimal degrees, must be -180 to 180)
  },
  "summary": "string (2-3 sentences providing context and significance)",
  "actors": ["string", "string"] (2-4 key parties involved),
  "credibility": {
    "score": number (0-100 based on specificity, source diversity, verifiable details),
    "label": "Low" | "Medium" | "High",
    "reason": "string (1 sentence explaining the credibility assessment)"
  },
  "relatedEvents": [
    {
      "date": "string (e.g. 'Mar 2022')",
      "title": "string (concise event title)",
      "description": "string (1 sentence about this historical event and its relevance)",
      "type": "strike" | "escalation" | "negotiation" | "humanitarian" | "political",
      "lat": number (decimal degrees of event location),
      "lng": number (decimal degrees of event location)
    }
  ] (EXACTLY 3 historically related real events from your knowledge),
  "escalationRisk": "Low" | "Medium" | "High",
  "escalationReason": "string (1 sentence explaining the escalation risk assessment)"
}

IMPORTANT:
- All coordinates must be geographically accurate decimal degrees
- relatedEvents must be exactly 3 real historical events related to the conflict/region
- Do not invent events — use real documented events from your training data
- Credibility score 75-100 = well-sourced with specifics; 50-74 = some details but gaps; 0-49 = vague or unverifiable`;

router.post("/analyze", async (req, res) => {
  const { article } = req.body;

  if (!article || typeof article !== "string" || article.trim().length < 50) {
    res.status(400).json({
      error: "INVALID_INPUT",
      message: "Article must be at least 50 characters long",
    });
    return;
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze this conflict news article:\n\n${article.trim()}`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({
        error: "AI_ERROR",
        message: "Unexpected response format from AI",
      });
      return;
    }

    const raw = block.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "Failed to parse AI response as JSON");
      res.status(500).json({
        error: "PARSE_ERROR",
        message: "AI returned malformed response. Please try again.",
      });
      return;
    }

    if (
      parsed.location?.lat < -90 ||
      parsed.location?.lat > 90 ||
      parsed.location?.lng < -180 ||
      parsed.location?.lng > 180
    ) {
      res.status(500).json({
        error: "INVALID_COORDINATES",
        message: "AI returned invalid geographic coordinates",
      });
      return;
    }

    if (parsed.relatedEvents) {
      parsed.relatedEvents = parsed.relatedEvents.map((ev: { lat: number; lng: number }) => ({
        ...ev,
        lat: Math.max(-90, Math.min(90, ev.lat)),
        lng: Math.max(-180, Math.min(180, ev.lng)),
      }));
    }

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Intelligence analysis failed");
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "Analysis failed. Please try again.",
    });
  }
});

export default router;
