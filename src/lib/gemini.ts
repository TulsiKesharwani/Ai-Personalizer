import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[gemini] GEMINI_API_KEY is not set");
}

export const genAI = new GoogleGenerativeAI(apiKey || "");

const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MODEL_CHAIN = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

export const VISION_MODEL = PRIMARY_MODEL;
export const TEXT_MODEL = PRIMARY_MODEL;

function parseRetryDelay(msg: string): number {
  const m = msg.match(/retry in ([\d.]+)s/i);
  if (m) return Math.min(parseFloat(m[1]) * 1000, 35000);
  return 0;
}

async function withRetry<T>(
  fn: (model: string) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (const model of MODEL_CHAIN) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await fn(model);
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isDailyQuota = /PerDay|RequestsPerDay/i.test(msg);
        const isQuotaZero = /limit:\s*0/i.test(msg);
        const isOverload = /503|overloaded|unavailable/i.test(msg);
        const isMinuteQuota = /429|exhausted|quota/i.test(msg) && !isDailyQuota;

        if (isDailyQuota || isQuotaZero) break;
        if (!isOverload && !isMinuteQuota) throw err;
        if (attempt === 1) break;

        const retryAfter = parseRetryDelay(msg);
        const wait = Math.min(retryAfter > 0 ? retryAfter + 500 : 3000, 5000);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastError;
}

export interface AdAnalysis {
  headline: string;
  offer: string;
  audience: string;
  tone: string;
  keyMessages: string[];
  primaryCTA: string;
  dominantColors: string[];
  brandMood: string;
  urgencyLevel: "low" | "medium" | "high";
}

export interface PersonalizationResult {
  adAnalysis: AdAnalysis;
  personalizedHtml: string;
  insights: {
    adSummary: string;
    changesApplied: Array<{ area: string; before: string; after: string; why: string }>;
    croImprovements: string[];
    personalizationScore: number;
  };
}

const extractJson = <T>(text: string): T => {
  console.log("[gemini] Raw response length:", text.length);
  console.log("[gemini] Raw response preview:", text.substring(0, 500));
  console.log("[gemini] Raw response end:", text.substring(text.length - 500));
  
  // Try to extract JSON from fenced code blocks first
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  let raw = fenced ? fenced[1] : text;
  
  console.log("[gemini] After fence extraction length:", raw.length);
  console.log("[gemini] Contains braces:", raw.includes("{"), raw.includes("}"));
  
  // Remove any leading/trailing text that might be outside the JSON
  raw = raw.trim();
  
  // Look for JSON object boundaries
  const start = raw.indexOf("{");
  let end = raw.lastIndexOf("}");
  
  console.log("[gemini] JSON boundaries:", { start, end, totalLength: raw.length });
  
  // If we can't find both boundaries, try to find a valid JSON substring
  if (start === -1 || end === -1) {
    console.log("[gemini] No clear JSON boundaries, attempting to find valid JSON substring");
    
    // Try to find any substring that looks like JSON
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      raw = jsonMatch[0];
      console.log("[gemini] Found JSON substring with regex");
    } else {
      console.error("[gemini] No JSON object found in response");
      console.log("[gemini] Full response for debugging:", text);
      throw new Error("No JSON object in model response");
    }
  } else {
    // Extract the JSON object
    raw = raw.slice(start, end + 1);
    console.log("[gemini] Extracted JSON object, length:", raw.length);
  }
  
  // Additional validation: check if the JSON looks complete
  if (raw.length > 0) {
    const openBraces = (raw.match(/\{/g) || []).length;
    const closeBraces = (raw.match(/\}/g) || []).length;
    const openBrackets = (raw.match(/\[/g) || []).length;
    const closeBrackets = (raw.match(/\]/g) || []).length;
    
    console.log("[gemini] Brace balance:", { openBraces, closeBraces, openBrackets, closeBrackets });
    
    // If braces don't match, try to fix incomplete JSON
    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      console.log("[gemini] Unbalanced braces detected, attempting to fix incomplete JSON");
      
      // Add missing closing braces/brackets
      let fixedRaw = raw;
      const missingBraces = openBraces - closeBraces;
      const missingBrackets = openBrackets - closeBrackets;
      
      if (missingBraces > 0) {
        fixedRaw += '}'.repeat(missingBraces);
        console.log("[gemini] Added", missingBraces, "missing closing braces");
      }
      
      if (missingBrackets > 0) {
        fixedRaw += ']'.repeat(missingBrackets);
        console.log("[gemini] Added", missingBrackets, "missing closing brackets");
      }
      
      raw = fixedRaw;
    }
  }
  
  console.log("[gemini] JSON to parse (first 1000 chars):", raw.substring(0, 1000));
  
  try {
    const result = JSON.parse(raw);
    console.log("[gemini] Successfully parsed JSON");
    return result as T;
  } catch (parseError) {
    console.error("[gemini] JSON parse error:", parseError);
    console.log("[gemini] Error position info:", (parseError as any).message);
    console.log("[gemini] Attempting to fix common JSON issues...");
    
    // Try to fix common issues
    let fixedJson = raw
      .replace(/,\s*}/g, '}')  // Remove trailing commas
      .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      .replace(/\n/g, '')      // Remove newlines that might cause issues
      .replace(/\t/g, ' ')     // Replace tabs with spaces
      .replace(/\r/g, '');     // Remove carriage returns
    
    console.log("[gemini] Attempting to parse fixed JSON");
    
    try {
      const result = JSON.parse(fixedJson);
      console.log("[gemini] Successfully parsed fixed JSON");
      return result as T;
    } catch (secondError) {
      console.error("[gemini] Fixed JSON also failed to parse:", secondError);
      console.log("[gemini] Fixed JSON preview:", fixedJson.substring(0, 1000));
      
      // Final fallback: create a minimal valid response
      console.log("[gemini] Using fallback response due to complete JSON parsing failure");
      const fallbackResponse = {
        adAnalysis: {
          headline: "AI Analysis Failed",
          offer: "Unable to analyze",
          audience: "Unknown",
          tone: "Neutral",
          keyMessages: ["Analysis incomplete"],
          primaryCTA: "Contact Support",
          dominantColors: ["#000000", "#FFFFFF"],
          brandMood: "Unknown",
          urgencyLevel: "low" as const
        },
        personalizedHtml: "<html><body><h1>Personalization Failed</h1><p>Unable to process the request due to AI response parsing issues.</p></body></html>",
        insights: {
          adSummary: "AI analysis failed - fallback response",
          changesApplied: [
            {
              area: "System",
              before: "AI Analysis",
              after: "Fallback Response",
              why: "JSON parsing failed completely"
            }
          ],
          croImprovements: ["None - fallback mode"],
          personalizationScore: 0
        }
      };
      
      return fallbackResponse as T;
    }
  }
};

export async function personalizeInOneShot(
  image: { base64: string; mimeType: string },
  landingHtml: string,
  pageMeta: { title: string; description: string; url: string }
): Promise<PersonalizationResult> {
  const trimmedHtml =
    landingHtml.length > 120000 ? landingHtml.slice(0, 120000) : landingHtml;

  const prompt = `You are an elite performance marketing + CRO expert. In ONE response, you will:
1) Analyze the attached ad creative.
2) Rewrite the existing landing page HTML to (a) message-match the ad and (b) apply proven CRO principles.

## LANDING PAGE METADATA
- URL: ${pageMeta.url}
- Title: ${pageMeta.title}
- Description: ${pageMeta.description}

## CRO PRINCIPLES TO APPLY
1. Message match: hero headline must echo the ad's headline/offer within 2 seconds of load.
2. Single primary CTA above the fold, action-oriented, outcome-focused.
3. Reduce cognitive load — tighten copy, remove hedge words.
4. Surface social proof if present.
5. Create urgency matching the ad's urgency level (not spammy).
6. Visual hierarchy: contrast CTA color against page.
7. Benefit-driven subheadlines, not feature dumps.

## PERSONALIZATION RULES
- DO NOT rebuild the page. PRESERVE structure, sections, images, links, scripts.
- ONLY rewrite text (headlines, subheads, CTAs, microcopy) and restyle key accents (CTA colors, hero highlights) to match the ad.
- Inject a <style> block at the end of <head> that overrides CTA/button/accent colors using the ad's dominant colors.
- Output must be a complete, valid, renderable HTML document.

## OUTPUT FORMAT — STRICT JSON (no markdown, no prose, no fencing)
{
  "adAnalysis": {
    "headline": "main hook from the ad",
    "offer": "specific offer / value prop",
    "audience": "target audience",
    "tone": "emotional tone",
    "keyMessages": ["3-5 selling points"],
    "primaryCTA": "main call-to-action",
    "dominantColors": ["#hex1","#hex2"],
    "brandMood": "short phrase",
    "urgencyLevel": "low|medium|high"
  },
  "personalizedHtml": "<!DOCTYPE html>...complete modified HTML...",
  "insights": {
    "adSummary": "1-sentence summary of ad angle",
    "changesApplied": [
      {"area":"Hero headline","before":"...","after":"...","why":"message match"}
    ],
    "croImprovements": ["bullet list of upgrades"],
    "personalizationScore": 87
  }
}

## EXISTING LANDING PAGE HTML
\`\`\`html
${trimmedHtml}
\`\`\`

Return ONLY the raw JSON object. No prose, no markdown.`;

  return withRetry(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.45,
        maxOutputTokens: 32000,
      },
    });
    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: image.base64, mimeType: image.mimeType } },
    ]);
    return extractJson<PersonalizationResult>(result.response.text());
  });
}
