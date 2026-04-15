# Persona.ai — AI Landing Page Personalizer

Drop an ad creative + a landing page URL. In seconds, get a personalized, CRO-enhanced version of that existing page that message-matches the ad.

**Stack**: Next.js 16 · React 19 · TypeScript · Tailwind v4 · Framer Motion · Google Gemini 2.5 Flash

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Add your Gemini API key

Get a free API key from https://aistudio.google.com/apikey (click **"Create API key" → "Create API key in new project"** for a fresh 20 req/day quota).

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Then open `.env.local` and replace `your_gemini_api_key_here` with your actual key:

```
GEMINI_API_KEY=AIzaSy...your-key-here
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How to use it

1. **Step 1 — Ad Creative**: Upload an image, or paste an image URL.
2. **Step 2 — Landing Page URL**: Paste any public landing page URL.
3. Click **Generate Personalized Page**.
4. See the split-view result with an insights panel showing what changed and why.

### Sample test pair (fast to try)

- **Ad image**: `https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1200`
- **Landing URL**: `https://example.com`

---

## Features

- 🎯 **Message match** — hero headlines echo the ad's hook within 2 seconds of load
- 🎨 **Brand-matched accents** — primary CTA is restyled with the ad's dominant colors
- 📈 **CRO upgrades** — single primary CTA, benefit-led subheads, calibrated urgency
- 🔍 **Change audit** — every edit is logged with `before / after / why` in an insights panel
- 🖼️ **Split view** — see Personalized, Original, or both side-by-side
- 💾 **Download HTML** — save the personalized page
- 🛟 **Graceful fallback** — when Gemini is rate-limited or unavailable, the system falls back to a deterministic demo mode so the UX never dead-ends

---

## Project Structure

```
personalizer/
├── src/
│   ├── app/
│   │   ├── api/personalize/route.ts   # POST /api/personalize — orchestration
│   │   ├── globals.css                # Tailwind tokens, glass, gradient
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Main input → loader → result flow
│   ├── components/
│   │   ├── GradientBackground.tsx     # Animated glow orbs + grid
│   │   ├── AdDropzone.tsx             # Upload/URL input for ads
│   │   ├── UrlInput.tsx
│   │   ├── GenerateButton.tsx         # Shimmer CTA with loading state
│   │   ├── PipelineLoader.tsx         # 4-step animated progress
│   │   └── ResultView.tsx             # Split view + insights panel
│   └── lib/
│       ├── gemini.ts                  # Gemini SDK wrapper + retry chain
│       ├── scrape.ts                  # Cheerio-based page scraping
│       ├── mock.ts                    # Demo-mode deterministic transforms
│       └── utils.ts
└── docs/
    ├── PRODUCT_IMPLEMENTATION.pdf     # PM-facing implementation doc
    └── DEVELOPER_IMPLEMENTATION.md    # Deep-dive dev doc
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ yes | Your Google Gemini API key |
| `GEMINI_MODEL` | no | Override primary model (default: `gemini-2.5-flash`) |
| `MOCK_MODE` | no | Set to `true` to force demo mode without calling Gemini |

---

## Troubleshooting

**"Demo mode" badge appears with quota notice** → Your Gemini API key has hit the free-tier daily cap (20 requests/day per Google Cloud project). Create a new API key in a **new** Google Cloud project at https://aistudio.google.com/apikey to reset, or enable billing for higher limits.

**"503 Service Unavailable"** → Gemini 2.5 Flash is temporarily overloaded on Google's side. The app auto-retries with fallback models and then falls back to demo mode. Try again in a few minutes.

**Landing page scraping fails** → Some sites block unknown User-Agents or require JavaScript rendering. Try a simpler page like `https://example.com` first to verify the pipeline, then try `https://linear.app` or `https://stripe.com`.

---

## Documentation

- **`docs/PRODUCT_IMPLEMENTATION.pdf`** — Product-facing implementation doc: user flow, agent design, edge case handling, assumptions, metrics, roadmap.
- **`docs/DEVELOPER_IMPLEMENTATION.md`** — Deep-dive developer doc: architecture, API contract, prompt design, retry logic, scraping internals, gotchas.
