# Persona.ai — Developer Implementation Document

**Project**: AI Landing Page Personalizer
**Stack**: Next.js 16 · React 19 · TypeScript · Tailwind v4 · Framer Motion · Google Gemini 2.5 Flash
**Repo path**: `/personalizer`
**Status**: Working local demo with AI + demo-mode fallback

---

## 1. Overview

Persona.ai takes two inputs — an **ad creative** (image upload or URL) and a **landing page URL** — and returns an *enhanced*, personalized version of that existing page. It does **not** generate a brand-new page. It rewrites headlines, CTAs, accent colors, and injects urgency cues based on the ad's offer/tone/visual identity, while applying established CRO principles.

The product is a single-page Next.js app with one server-side API route that orchestrates the AI pipeline. A deterministic rule-based fallback runs when the LLM is unavailable, so the UX never dead-ends.

---

## 2. Tech Stack & Why

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Single project for both client + API routes, no CORS headaches, easy Vercel deploy, built-in env loading |
| Language | **TypeScript** | End-to-end type safety across AI response shapes, API contracts, UI props |
| Styling | **Tailwind v4** | Utility-first + `@theme inline` for design tokens; fast iteration on the glass/gradient aesthetic |
| Animation | **Framer Motion** | Best-in-class React animation API — used for the pipeline loader, gradient orbs, layout transitions, entry/exit animations |
| AI Model | **Gemini 2.5 Flash** | Free tier, multimodal (vision + text), 1M-token context (handles full landing page HTML), strong JSON compliance |
| Scraping | **cheerio** | Zero-JS DOM parsing, resolves relative URLs, strips `<script>` / `<noscript>`, lightweight |
| File Upload | **react-dropzone** | Polished drag-and-drop with file type / size validation |
| Icons | **lucide-react** | Consistent, tree-shakable icon set |

---

## 3. Project Structure

```
personalizer/
├── .env.local                    # GEMINI_API_KEY (gitignored)
├── src/
│   ├── app/
│   │   ├── api/personalize/
│   │   │   └── route.ts          # POST /api/personalize — orchestration
│   │   ├── globals.css           # Tailwind tokens, noise, grid, glass, shimmer
│   │   ├── layout.tsx            # Root layout, fonts, dark mode
│   │   └── page.tsx              # Main input → loader → result flow
│   ├── components/
│   │   ├── GradientBackground.tsx  # Animated glow orbs + grid backdrop
│   │   ├── AdDropzone.tsx          # Upload/URL tabs for ad input
│   │   ├── UrlInput.tsx            # Landing URL input
│   │   ├── GenerateButton.tsx      # Animated CTA with shimmer + loading state
│   │   ├── PipelineLoader.tsx      # 4-step animated progress (Analyze → Scrape → Personalize → Finalize)
│   │   └── ResultView.tsx          # Split view, iframe preview, insights panel
│   └── lib/
│       ├── gemini.ts             # Gemini SDK wrapper, prompt, retry chain
│       ├── scrape.ts             # Cheerio-based scraping + URL absolutization
│       ├── mock.ts               # Demo-mode: deterministic CRO transforms
│       └── utils.ts              # cn() + fileToBase64 helper
└── docs/
    ├── DEVELOPER_IMPLEMENTATION.md
    └── PRODUCT_IMPLEMENTATION.pdf
```

---

## 4. Local Setup

```bash
cd /Users/atharvshukla/Developer/tulsi/AI/personalizer
npm install
echo "GEMINI_API_KEY=your_key_here" > .env.local
npm run dev
# open http://localhost:3000
```

**Optional env vars**
- `GEMINI_MODEL` — override the primary model (default: `gemini-2.5-flash`)
- `MOCK_MODE=true` — force demo mode, skip Gemini entirely (useful for UI iteration without burning quota)

---

## 5. API Contract

### `POST /api/personalize`

**Request body**
```ts
{
  landingUrl: string;              // required, http(s):// optional
  adImageBase64?: string;          // base64-encoded image (if uploading)
  adImageMime?: string;            // e.g. "image/jpeg"
  adImageUrl?: string;             // OR provide a direct image URL
}
```
Must provide either `adImageBase64` or `adImageUrl`.

**Response (200)**
```ts
{
  mode: "ai" | "demo";
  notice?: string;                 // present when falling back to demo mode
  adAnalysis: {
    headline: string;
    offer: string;
    audience: string;
    tone: string;
    keyMessages: string[];
    primaryCTA: string;
    dominantColors: string[];      // hex codes
    brandMood: string;
    urgencyLevel: "low" | "medium" | "high";
  };
  originalHtml: string;            // scraped, absolutized, script-stripped
  personalizedHtml: string;        // full renderable HTML document
  insights: {
    adSummary: string;
    changesApplied: Array<{
      area: string;                // "Hero headline", "Primary CTA", etc.
      before: string;
      after: string;
      why: string;                 // which CRO principle
    }>;
    croImprovements: string[];
    personalizationScore: number;  // 0–100
  };
  meta: { title: string; description: string; finalUrl: string };
}
```

**Error (4xx/5xx)**
```ts
{ error: string; detail?: string }
```

---

## 6. AI Pipeline

### 6.1 High-level flow

```
User submits (ad, url)
        │
        ▼
┌─────────────────────┐         ┌──────────────────┐
│  Ad → base64        │ parallel│  Landing URL     │
│  (fetch or upload)  │◄────────│  → cheerio scrape│
└─────────┬───────────┘         └─────────┬────────┘
          │                               │
          └───────────────┬───────────────┘
                          ▼
              ┌──────────────────────────┐
              │  Single Gemini call      │
              │  (vision + HTML rewrite) │
              │  temp=0.45               │
              └──────────┬───────────────┘
                         │
                         ▼
              Returns { adAnalysis, personalizedHtml, insights }
                         │
                         ▼
                    Client renders
```

### 6.2 Why one combined call (not two)

The initial design used **two** Gemini calls: (1) analyze ad → adAnalysis JSON, (2) rewrite HTML with adAnalysis as context. This was clean but doubled the rate-limit load.

**Final design**: a single multimodal call that receives both the ad image and the HTML, and returns a unified JSON with analysis + rewrite + insights. This:
- Halves the quota burn
- Keeps the ad → rewrite link in a single attention window (tighter message match)
- Fails faster on quota/503 errors

### 6.3 Prompt design

The system prompt (in `src/lib/gemini.ts`, `personalizeInOneShot`) enforces:

1. **Two-task framing**: "In ONE response, you will: (1) Analyze the ad, (2) Rewrite the HTML."
2. **Hard preservation rules**: PRESERVE structure, sections, images, links, scripts — ONLY rewrite text and restyle key accents.
3. **CRO principle checklist**: 7 numbered principles (message match, single primary CTA, cognitive load, social proof, urgency calibration, visual hierarchy, benefit-led subheads).
4. **Color injection strategy**: "Inject a `<style>` block at the end of `<head>` that overrides CTA/accent colors using the ad's dominant colors."
5. **Strict JSON output schema** with example values.
6. **Explicit "Return ONLY raw JSON"** instruction (redundant but valuable).

### 6.4 Response parsing (`extractJson`)

Gemini can wrap JSON in markdown fences, add leading prose, or occasionally drop the final `}`. The parser:

1. Looks for a fenced code block first (```json ... ```)
2. Falls back to the first `{` → last `}` slice
3. Throws a clear error if no object is found

This is defensive — it handles cases where `responseMimeType: "application/json"` isn't available (it currently 503s on image + JSON-mode on 2.5-flash).

### 6.5 Retry + model fallback chain

```ts
const MODEL_CHAIN = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
```

Per request, we loop through the chain. For each model, up to 2 attempts with short backoff. The loop **short-circuits on daily quota exhaustion** (detected via `PerDay` in the error message) since retrying with the same key is pointless.

Retry triggers:
- `503 Service Unavailable` / `overloaded` → wait up to 5s, retry
- `429` per-minute quota → parse `retry in Xs` from the error body, wait up to 5s, retry
- `429` daily quota (`PerDay`, `limit: 0`) → break immediately, try next model
- Any other error → throw (don't retry)

### 6.6 Failure → demo mode fallback

When the entire AI chain exhausts, the API route catches the error and calls `mockPersonalize()` (see `src/lib/mock.ts`). This uses **cheerio** to:

1. Pick a seeded demo "ad analysis" (two hardcoded options, chosen deterministically from the URL hash)
2. Find the first `<h1>`, rewrite to the demo headline, add a gradient class
3. Find the first `<p>`, swap for an ad-derived subheadline
4. Find the first button/link whose text matches common CTA keywords (buy/shop/start/sign up/…), rewrite the text, add a `persona-cta` class
5. Inject a `<style>` block overriding `.persona-cta` with a brand gradient (ad's dominant colors)
6. Prepend a top-of-page urgency banner if `urgencyLevel === "high"`
7. Return the same `PersonalizationResult` shape as the AI path

The UI shows an amber "Demo mode" badge + notice explaining *why* (daily quota, 503, billing, etc.).

---

## 7. Scraping (`src/lib/scrape.ts`)

**`scrapeLandingPage(url)`** does:

1. `fetch` with a realistic desktop Chrome User-Agent (many sites block unknown UAs)
2. Follow redirects, capture `res.url` as `finalUrl` (for base URL resolution)
3. Load HTML into cheerio
4. **Strip `<script>` and `<noscript>`** — critical, because:
   - Re-executing arbitrary third-party JS inside a sandboxed iframe on localhost would break or spam network requests
   - The LLM doesn't need runtime behavior to rewrite copy
5. **Absolutize all URLs**: `<a href>`, `<link href>`, `<img src>`, `<source src>`, `<img srcset>`, `<source srcset>`. This ensures the preview iframe can load images and styles from the original domain.
6. **Inject `<base href>`** into the head as a safety net for any unresolved relative URLs the iframe encounters.
7. Extract `title`, meta description, and first 4000 chars of body text (used for prompt context if needed).

**Trade-off**: We do not execute JavaScript. Pages that are SPA-rendered (React/Vue mounts after load) will be partially empty. For the scope of this demo, server-rendered + hydrated pages work great; pure client-rendered ones produce less interesting output. A future upgrade would swap to Playwright for JS-rendered scraping.

---

## 8. Handling Edge Cases

### 8.1 Random / unexpected changes from the LLM

**Risk**: The model drops sections, removes images, or rearranges the DOM.

**Mitigations**:
- Prompt has an **explicit preservation contract**: "PRESERVE structure, sections, images, links, scripts. ONLY rewrite text and restyle key accents."
- The user can always flip the view toggle to `Original` in the result screen, so a bad rewrite is visually auditable.
- The insights panel shows a `changesApplied` ledger — every change with `before / after / why`. If the model drops a section without declaring it, the audit trail makes it obvious.
- Temperature is kept low (0.45) to reduce creative drift.

### 8.2 Broken UI output

**Risk**: Returned HTML is malformed, self-XSS, or can't render.

**Mitigations**:
- All preview rendering happens inside a **sandboxed `<iframe>`** with `sandbox="allow-same-origin"` — no script execution, no top-level navigation, no form posts.
- The iframe src is a **blob URL** created from the returned HTML string, not injected via `document.write` or `innerHTML`. Isolation is strong.
- The **Code tab** renders the raw HTML as text so the user can inspect and copy it — if rendering fails, debugging is easy.
- The **Original view** is always one click away if Personalized is unusable.
- If JSON parsing fails on Gemini's response, we throw → API returns 500 → client shows a clear error and the generate button re-enables.

### 8.3 Hallucinations (made-up facts, fake testimonials, wrong prices)

**Risk**: Model invents pricing, customer names, or claims not present in source.

**Mitigations**:
- The prompt **never asks the model to generate new facts**. It asks it to *rewrite existing copy* while preserving structure.
- The `changesApplied` ledger forces the model to declare each change as `before → after`. This creates pressure against invented content and is auditable.
- We ground outputs in the ad's `offer`, `keyMessages`, and `primaryCTA` — all extracted from the uploaded image, not from the model's parametric memory.
- For the **demo mode** fallback, there's no hallucination risk because transformations are deterministic (hardcoded demo ads + DOM manipulation).
- **Known gap**: the model can still embellish — e.g. turn "Fast shipping" into "Lightning-fast same-day shipping". A production version would add a post-processor that checks the personalized page against the original to flag any numeric/claim drift.

### 8.4 Inconsistent outputs (same input → different results)

**Risk**: Rerunning with the same ad + URL produces wildly different rewrites.

**Mitigations**:
- **Low temperature (0.45)** — not zero, because we still want creative phrasing for CTAs/headlines, but low enough that structure and key choices are stable.
- **Strict JSON output schema** in the prompt → output shape is deterministic even if content varies.
- **Single combined prompt** — splitting into multiple calls introduces more variance at each hop.
- **Demo mode uses a deterministic hash** of the URL to pick a demo ad, so repeated demo runs produce identical output.
- **Known gap**: we don't cache by `(adHash, urlHash)`. Adding a tiny in-memory LRU would make repeat testing free.

---

## 9. Security & Safety

- **API key is server-only** — never exposed to the browser. The `/api/personalize` route runs under `runtime: "nodejs"`.
- **Iframe sandbox** prevents the rendered output from executing scripts or escaping.
- **Input validation**: `landingUrl` is required, auto-prefixed with `https://` if missing, and passed through `new URL()` for structural validation.
- **Image size**: react-dropzone caps uploads at 10MB; base64-encoded images fit in request body limits.
- **No secrets in logs** — only high-level error types are logged.
- **SSRF risk**: the server-side `fetch` to the landing URL is a known attack surface. For production, we'd add an allowlist or block internal IP ranges (169.254.x, 10.x, 192.168.x, etc.).

---

## 10. Known Limitations

| Limitation | Impact | Mitigation path |
|---|---|---|
| **JS-rendered SPAs scrape poorly** | Partial or empty HTML for client-rendered sites | Swap cheerio for Playwright |
| **Gemini free tier is 20 RPD per project** | Hits quota fast during testing | Demo mode fallback; billing enables 1000 RPM |
| **No response caching** | Repeat runs consume quota | Add LRU keyed on `(adHash, urlHash)` |
| **Gemini sometimes 503s on image + JSON-mode** | Forces us to use plain text output + parser | Parser handles it; revisit when stable |
| **No streaming** | User waits up to 120s in AI mode | Stream JSON via Server-Sent Events |
| **No CORS allowlist on scraper** | Some sites block unknown UAs | Rotate UA pool, add backoff, respect robots.txt |
| **Demo mode uses 2 hardcoded ads** | Limited variety in fallback | Analyze image colors server-side (sharp + k-means) to generate a real pseudo-analysis |

---

## 11. Deployment Notes

- **Build**: `npm run build`
- **Output**: Standard Next.js build, ready for Vercel / Netlify / any Node host.
- **Env vars** needed in production: `GEMINI_API_KEY` (required), `GEMINI_MODEL` (optional).
- **Runtime**: `nodejs` is required (not `edge`) because `cheerio` uses Node APIs.
- **Timeouts**: `maxDuration = 120` on the API route. On Vercel Hobby plan, adjust to fit the 60s cap — split the AI call into two if needed.
- **Cold start**: First request can take 2–5s for Gemini SDK init. Warm thereafter.

---

## 12. Future Improvements

1. **Playwright scraping** for JS-rendered pages
2. **Response cache** (LRU) to make iteration free
3. **Streaming** the JSON response via SSE so the UI shows partial results
4. **Multi-variant** — generate 2–3 variants per request, let user pick
5. **A/B export** — output both a Google Optimize snippet and raw HTML
6. **Analytics instrumentation** — track personalizationScore vs. actual lift
7. **Brand asset extraction** — pull logo + fonts from the landing page and bias the rewrite toward them
8. **Post-processor for hallucination detection** — diff personalized vs. original for new claims, flag suspicious insertions
9. **Prompt eval harness** — golden set of (ad, url) → expected signals, regression testing

---

## 13. Development Log / Gotchas

- **Gemini 2.5 Flash + image + `responseMimeType: application/json` consistently 503s.** Dropping the JSON mime type and relying on the prompt + client-side parser fixed it.
- **Free tier quotas are per-GCP-project**, not per-API-key. A new API key in the same project still shares the 20 RPD pool. To reset, explicitly create the key in a new project.
- **Next.js 16 uses Turbopack by default**. Some old docs/snippets referencing Webpack configs don't apply.
- **`lucide-react@latest`** was needed — the auto-installed version was a stale legacy release.
- **`cheerio.html()`** returns a complete serialized doc only if the input had one; always prepend `<base>` tag after load to handle doc fragments cleanly.
