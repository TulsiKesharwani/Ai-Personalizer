import { NextRequest, NextResponse } from "next/server";
import { scrapeLandingPage, fetchImageAsBase64 } from "@/lib/scrape";
import { personalizeInOneShot } from "@/lib/gemini";
import { mockPersonalize } from "@/lib/mock";

export const runtime = "nodejs";
export const maxDuration = 120;

interface PersonalizeBody {
  landingUrl: string;
  adImageBase64?: string;
  adImageMime?: string;
  adImageUrl?: string;
}

const isGeminiUnavailable = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|exhausted|quota|RESOURCE_EXHAUSTED|503|overloaded|unavailable/i.test(msg);
};

const describeFailure = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  if (/PerDay|RequestsPerDay|limit:\s*0/i.test(msg)) {
    return "Gemini daily free-tier quota exhausted. Showing demo-mode personalization. To unlock full AI rewrites: create an API key in a NEW Google Cloud project (not the existing one), or enable billing at https://console.cloud.google.com/billing.";
  }
  if (/503|overloaded|unavailable/i.test(msg)) {
    return "Gemini models are experiencing high demand (503). Showing demo-mode personalization while they recover. Try again in a few minutes for the real AI rewrite.";
  }
  if (/429|quota|exhausted/i.test(msg)) {
    return "Gemini rate limit hit. Showing demo-mode personalization. Try again in ~60s for the real AI rewrite.";
  }
  return "Falling back to demo-mode personalization (rule-based CRO transforms).";
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PersonalizeBody;
    const { landingUrl, adImageBase64, adImageMime, adImageUrl } = body;

    if (!landingUrl) {
      return NextResponse.json({ error: "landingUrl is required" }, { status: 400 });
    }
    if (!adImageBase64 && !adImageUrl) {
      return NextResponse.json(
        { error: "Provide adImageBase64 or adImageUrl" },
        { status: 400 }
      );
    }

    let normalizedLanding = landingUrl.trim();
    if (!/^https?:\/\//i.test(normalizedLanding)) {
      normalizedLanding = "https://" + normalizedLanding;
    }

    const [image, scraped] = await Promise.all([
      adImageBase64
        ? Promise.resolve({
            base64: adImageBase64,
            mimeType: adImageMime || "image/jpeg",
          })
        : fetchImageAsBase64(adImageUrl!),
      scrapeLandingPage(normalizedLanding),
    ]);

    const pageMeta = {
      title: scraped.title,
      description: scraped.description,
      url: scraped.finalUrl,
    };

    const forceMock = process.env.MOCK_MODE === "true";
    let result;
    let mode: "ai" | "demo" = "ai";
    let notice: string | undefined;

    if (forceMock) {
      result = mockPersonalize(scraped.html, pageMeta, scraped.finalUrl);
      mode = "demo";
      notice = "Demo mode (MOCK_MODE=true) — deterministic transforms, no AI call.";
    } else {
      try {
        result = await personalizeInOneShot(image, scraped.html, pageMeta);
      } catch (err) {
        if (isGeminiUnavailable(err)) {
          console.warn("[personalize] Gemini unavailable — falling back to demo mode:", err);
          result = mockPersonalize(scraped.html, pageMeta, scraped.finalUrl);
          mode = "demo";
          notice = describeFailure(err);
        } else {
          throw err;
        }
      }
    }

    return NextResponse.json({
      mode,
      notice,
      adAnalysis: result.adAnalysis,
      originalHtml: scraped.html,
      personalizedHtml: result.personalizedHtml,
      insights: result.insights,
      meta: pageMeta,
    });
  } catch (err) {
    console.error("[personalize] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Personalization failed", detail: message },
      { status: 500 }
    );
  }
}
