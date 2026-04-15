import * as cheerio from "cheerio";
import type { PersonalizationResult, AdAnalysis } from "./gemini";

const DEMO_ADS: AdAnalysis[] = [
  {
    headline: "Summer Sale — 30% Off Everything",
    offer: "30% off sitewide, limited time",
    audience: "Style-conscious millennials who value quality and deals",
    tone: "urgent, energetic, confident",
    keyMessages: [
      "Biggest sale of the season",
      "Free shipping over $50",
      "Ends this Sunday",
    ],
    primaryCTA: "Shop The Sale",
    dominantColors: ["#ff3b5c", "#ffcf3b", "#111111"],
    brandMood: "bold, modern, energetic",
    urgencyLevel: "high",
  },
  {
    headline: "Built for Professionals Who Move Fast",
    offer: "Free trial, no credit card required",
    audience: "Founders, PMs, and senior ICs at tech companies",
    tone: "confident, minimal, premium",
    keyMessages: [
      "Ship 10x faster",
      "Trusted by 40,000+ teams",
      "Enterprise-grade from day one",
    ],
    primaryCTA: "Start Free Trial",
    dominantColors: ["#7c3aed", "#0ea5e9", "#0a0a0a"],
    brandMood: "sleek, professional, trustworthy",
    urgencyLevel: "medium",
  },
];

function pickAd(seed: string): AdAnalysis {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return DEMO_ADS[Math.abs(h) % DEMO_ADS.length];
}

const ctaPhrases = [
  "buy",
  "shop",
  "get started",
  "sign up",
  "try",
  "start",
  "learn",
  "download",
  "subscribe",
  "join",
  "contact",
  "book",
];

export function mockPersonalize(
  landingHtml: string,
  pageMeta: { title: string; description: string; url: string },
  seed: string
): PersonalizationResult {
  const ad = pickAd(seed);
  const $ = cheerio.load(landingHtml);

  const accent = ad.dominantColors[0] || "#7c3aed";
  const accent2 = ad.dominantColors[1] || "#0ea5e9";

  const styleBlock = `
<style id="persona-ai-override">
  :root {
    --persona-accent: ${accent};
    --persona-accent-2: ${accent2};
  }
  a.persona-cta, button.persona-cta, .persona-cta-auto {
    background: linear-gradient(135deg, ${accent} 0%, ${accent2} 100%) !important;
    color: #ffffff !important;
    border: none !important;
    box-shadow: 0 12px 28px -8px ${accent}66 !important;
    transform: translateY(0);
    transition: transform .18s ease, box-shadow .18s ease;
  }
  a.persona-cta:hover, button.persona-cta:hover, .persona-cta-auto:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 36px -10px ${accent}80 !important;
  }
  .persona-urgency-banner {
    display: block;
    text-align: center;
    padding: 10px 16px;
    background: ${accent};
    color: #fff;
    font-weight: 600;
    font-size: 14px;
    letter-spacing: .02em;
  }
  .persona-hero-highlight {
    background: linear-gradient(135deg, ${accent} 0%, ${accent2} 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
</style>`;

  $("head").append(styleBlock);

  const changes: Array<{ area: string; before: string; after: string; why: string }> = [];

  const h1 = $("h1").first();
  const originalH1 = h1.text().trim();
  if (h1.length && originalH1) {
    const newH1 = `${ad.headline}`;
    h1.text(newH1);
    h1.addClass("persona-hero-highlight");
    changes.push({
      area: "Hero headline",
      before: originalH1,
      after: newH1,
      why: "Message match — echo the ad's hook within 2 seconds of load",
    });
  }

  const firstP = $("p").first();
  const originalP = firstP.text().trim();
  if (firstP.length && originalP) {
    const newSub = `${ad.keyMessages[0]}. ${ad.keyMessages[1] || ""}`.trim();
    firstP.text(newSub);
    changes.push({
      area: "Hero subheadline",
      before: originalP.slice(0, 120),
      after: newSub,
      why: "Benefit-led copy that mirrors the ad's value prop",
    });
  }

  let ctaFound = false;
  $("a, button").each((_, el) => {
    if (ctaFound) return;
    const text = $(el).text().trim().toLowerCase();
    if (!text || text.length > 40) return;
    const matches = ctaPhrases.some((p) => text.includes(p));
    if (matches) {
      const before = $(el).text().trim();
      $(el).text(ad.primaryCTA);
      $(el).addClass("persona-cta");
      changes.push({
        area: "Primary CTA",
        before,
        after: ad.primaryCTA,
        why: "Action-oriented, outcome-focused, color-matched to ad",
      });
      ctaFound = true;
    }
  });

  if (!ctaFound) {
    const firstA = $("a").first();
    if (firstA.length) {
      firstA.addClass("persona-cta-auto");
      firstA.text(ad.primaryCTA);
      changes.push({
        area: "Primary CTA",
        before: "(no obvious CTA)",
        after: ad.primaryCTA,
        why: "Injected a clear single CTA matching the ad",
      });
    }
  }

  if (ad.urgencyLevel === "high") {
    $("body").prepend(
      `<div class="persona-urgency-banner">${ad.offer.toUpperCase()} — ACT FAST</div>`
    );
    changes.push({
      area: "Urgency banner",
      before: "(none)",
      after: `${ad.offer.toUpperCase()} — ACT FAST`,
      why: "Ad urgency is high — a top-of-page banner amplifies scarcity",
    });
  }

  const croImprovements = [
    "Hero headline now message-matches the ad within 2 seconds",
    `Primary CTA restyled with brand-matched gradient (${accent} → ${accent2})`,
    "Single dominant CTA above the fold to reduce decision paralysis",
    "Benefit-led subheadline replaces generic feature copy",
    ad.urgencyLevel === "high"
      ? "Top-of-page urgency banner reinforces the ad's scarcity cue"
      : "Urgency calibrated to ad — no spammy countdown",
  ];

  return {
    adAnalysis: ad,
    personalizedHtml: $.html(),
    insights: {
      adSummary: `${ad.offer} — targeting ${ad.audience.split(",")[0]} with a ${ad.tone.split(",")[0]} tone.`,
      changesApplied: changes,
      croImprovements,
      personalizationScore: 78,
    },
  };
}
