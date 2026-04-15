"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, AlertCircle } from "lucide-react";
import { GradientBackground } from "@/components/GradientBackground";
import { AdDropzone, type AdValue } from "@/components/AdDropzone";
import { UrlInput } from "@/components/UrlInput";
import { GenerateButton } from "@/components/GenerateButton";
import { PipelineLoader } from "@/components/PipelineLoader";
import { ResultView } from "@/components/ResultView";
import { fileToBase64 } from "@/lib/utils";

interface Result {
  mode?: "ai" | "demo";
  notice?: string;
  adAnalysis: {
    headline: string;
    offer: string;
    audience: string;
    tone: string;
    keyMessages: string[];
    primaryCTA: string;
    dominantColors: string[];
    brandMood: string;
    urgencyLevel: string;
  };
  originalHtml: string;
  personalizedHtml: string;
  insights: {
    adSummary: string;
    changesApplied: Array<{ area: string; before: string; after: string; why: string }>;
    croImprovements: string[];
    personalizationScore: number;
  };
}

export default function Home() {
  const [ad, setAd] = useState<AdValue>({ kind: null });
  const [landingUrl, setLandingUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate =
    !!landingUrl.trim() &&
    ((ad.kind === "file" && !!ad.file) || (ad.kind === "url" && !!ad.url));

  const generate = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, string> = { landingUrl };
      if (ad.kind === "file" && ad.file) {
        const { base64, mimeType } = await fileToBase64(ad.file);
        payload.adImageBase64 = base64;
        payload.adImageMime = mimeType;
      } else if (ad.kind === "url" && ad.url) {
        payload.adImageUrl = ad.url;
      }

      const res = await fetch("/api/personalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "Something went wrong");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <main className="relative min-h-screen flex flex-col">
      <GradientBackground />

      <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-sm font-semibold tracking-tight">
            Persona<span className="text-white/40">.ai</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[11px] text-white/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Powered by Gemini 2.0 Flash
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.section
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[11px] text-white/60 mb-6"
            >
              <Zap className="w-3 h-3 text-violet-300" />
              AI-powered landing page personalization
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl md:text-6xl font-semibold tracking-tight text-center max-w-3xl leading-[1.05]"
            >
              <span className="gradient-text">Turn any ad</span>
              <br />
              into a page that <em className="not-italic">converts</em>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="mt-5 text-center text-white/55 max-w-xl text-[15px] leading-relaxed"
            >
              Drop an ad creative and a landing page URL. In seconds, we rewrite the
              page to match the ad&apos;s message, tone, and visual identity — with
              battle-tested CRO principles baked in.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-2xl mt-10"
            >
              <div className="glass rounded-3xl p-6 md:p-7 space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-white/45 font-medium">
                    Step 1 · Ad Creative
                  </label>
                  <AdDropzone value={ad} onChange={setAd} />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-white/45 font-medium">
                    Step 2 · Landing Page URL
                  </label>
                  <UrlInput value={landingUrl} onChange={setLandingUrl} />
                </div>

                <PipelineLoader active={loading} />

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>{error}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <GenerateButton
                  onClick={generate}
                  disabled={!canGenerate}
                  loading={loading}
                />
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-5 flex items-center justify-center gap-6 text-[11px] text-white/35"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-white/30" />
                  Message match
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-white/30" />
                  CRO upgrades
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-white/30" />
                  Brand-matched colors
                </div>
              </motion.div>
            </motion.div>
          </motion.section>
        ) : (
          <ResultView
            key="result"
            originalHtml={result.originalHtml}
            personalizedHtml={result.personalizedHtml}
            insights={result.insights}
            adAnalysis={result.adAnalysis}
            mode={result.mode}
            notice={result.notice}
            onBack={reset}
          />
        )}
      </AnimatePresence>

      <footer className="relative z-10 text-center py-6 text-[11px] text-white/30">
        Built with Next.js · Gemini 2.0 Flash · Framer Motion
      </footer>
    </main>
  );
}
