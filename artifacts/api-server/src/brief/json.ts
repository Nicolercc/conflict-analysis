// ─── JSON Extraction Helper ───────────────────────────────────────────────
// Robustly extract valid JSON from Claude response that may contain:
// - Markdown code fences (```json ... ```)
// - Extra text before/after JSON
// - Incomplete JSON
function findFirstJsonBracketIndex(s: string): number {
  const i = s.indexOf("{");
  const j = s.indexOf("[");
  if (i === -1) return j;
  if (j === -1) return i;
  return Math.min(i, j);
}

export function extractJSON(text: string): object {
  // Remove markdown code fences (opening); strip trailing fence if present
  let cleaned = text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();

  let startIdx = findFirstJsonBracketIndex(cleaned);

  if (startIdx === -1) {
    throw new Error("No JSON object or array found in response");
  }
  
  // Use the first character as the opening bracket
  const openChar = cleaned[startIdx];
  const closeChar = openChar === "{" ? "}" : "]";
  
  let depth = 0;
  let endIdx = -1;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIdx; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === openChar) depth++;
    if (char === closeChar) {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  
  if (endIdx === -1) {
    throw new Error("Malformed JSON: could not find matching closing bracket");
  }
  
  const jsonStr = cleaned.substring(startIdx, endIdx);
  return JSON.parse(jsonStr);
}

/**
 * Coerce AI string/number coords. A pair is either fully valid or unknown:
 * an unusable lat or lng makes both null, so a missing place never becomes
 * a real point on the map.
 */
export function normalizeLatLng(
  lat: unknown,
  lng: unknown,
): { lat: number; lng: number } | { lat: null; lng: null } {
  const parse = (v: unknown): number => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v !== "string") return NaN;
    const t = v.trim().replace(/,/g, "");
    return /^[+-]?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
  };
  const la = parse(lat);
  const ln = parse(lng);
  const valid =
    Number.isFinite(la) && la >= -90 && la <= 90 &&
    Number.isFinite(ln) && ln >= -180 && ln <= 180;
  return valid ? { lat: la, lng: ln } : { lat: null, lng: null };
}

/** When the model adds preamble/postamble, try fenced blocks or trailing JSON. */
export function tryExtractJsonFallback(text: string): object | null {
  const fencedBlocks: string[] = [];
  const re = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1]?.trim();
    if (inner) fencedBlocks.push(inner);
  }
  for (const block of fencedBlocks.reverse()) {
    try {
      return extractJSON(block);
    } catch {
      /* try next */
    }
  }
  const lineStart = text.lastIndexOf("\n{");
  if (lineStart !== -1) {
    try {
      return extractJSON(text.slice(lineStart + 1));
    } catch {
      /* */
    }
  }
  const lb = text.lastIndexOf("{");
  if (lb !== -1) {
    try {
      return extractJSON(text.slice(lb));
    } catch {
      /* */
    }
  }
  return null;
}
