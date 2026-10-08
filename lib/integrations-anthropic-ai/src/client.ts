import Anthropic from "@anthropic-ai/sdk";

// ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL are the names to use. The longer
// AI_INTEGRATIONS_* names are still read so an existing deployment keeps working.
const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
const baseURL =
  process.env.ANTHROPIC_BASE_URL || process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || "https://api.anthropic.com";

if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY must be set.");
}

export const anthropic = new Anthropic({ apiKey, baseURL });
