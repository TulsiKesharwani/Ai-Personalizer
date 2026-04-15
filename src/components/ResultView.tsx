"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Download, Eye, Code2, ArrowLeft, Sparkles, TrendingUp, Zap, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Change {
  area: string;
  before: string;
  after: string;
  why: string;
}

interface Insights {
  adSummary: string;
  changesApplied: Change[];
  croImprovements: string[];
  personalizationScore: number;
}

interface AdAnalysis {
  headline: string;
  offer: string;
  audience: string;
  tone: string;
  keyMessages: string[];
  primaryCTA: string;
  dominantColors: string[];
  brandMood: string;
  urgencyLevel: string;
}

interface Props {
  originalHtml: string;
  personalizedHtml: string;
  insights: Insights;
  adAnalysis: AdAnalysis;
  mode?: "ai" | "demo";
  notice?: string;
  onBack: () => void;
}

type View = "personalized" | "original" | "split";

export function ResultView({
  originalHtml,
  personalizedHtml,
  insights,
  adAnalysis,
  mode,
  notice,
  onBack,
}: Props) {
  const [view, setView] = useState<View>("personalized");
  const [tab, setTab] = useState<"preview" | "code">("preview");

  const personalizedBlob = useMemo(
    () => URL.createObjectURL(new Blob([personalizedHtml], { type: "text/html" })),
    [personalizedHtml]
  );
  const originalBlob = useMemo(
    () => URL.createObjectURL(new Blob([originalHtml], { type: "text/html" })),
    [originalHtml]
  );

  const download = () => {
    const a = document.createElement("a");
    a.href = personalizedBlob;
    a.download = "personalized-landing.html";
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="w-full max-w-[1400px] mx-auto px-6 py-10"
    >
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start gap-2 p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-xs text-amber-200/90"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0 animate-pulse" />
          <div className="leading-relaxed">{notice}</div>
        </motion.div>
      )}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          New personalization
        </button>
        {mode === "demo" && (
          <div className="px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-200 uppercase tracking-wider font-medium">
            Demo mode
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex rounded-full glass p-1">
            {(["personalized", "split", "original"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-all",
                  view === v ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex rounded-full glass p-1">
            <button
              onClick={() => setTab("preview")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5",
                tab === "preview" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
              )}
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
            <button
              onClick={() => setTab("code")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5",
                tab === "code" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
              )}
            >
              <Code2 className="w-3 h-3" />
              Code
            </button>
          </div>
          <button
            onClick={download}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-xs font-medium hover:bg-white/90 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download HTML
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <motion.div
          layout
          className="glass rounded-3xl overflow-hidden relative"
          style={{ minHeight: "70vh" }}
        >
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-black/30">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <div className="flex-1 mx-3 px-3 py-1 rounded-md bg-white/[0.04] text-[11px] text-white/40 text-center truncate">
              {view === "original" ? "original" : view === "split" ? "personalized vs original" : "personalized"}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {tab === "preview" ? (
              <motion.div
                key={view + "-preview"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative"
                style={{ height: "calc(70vh - 44px)" }}
              >
                {view === "split" ? (
                  <div className="grid grid-cols-2 h-full">
                    <div className="border-r border-white/10 relative">
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-[10px] text-white/70 uppercase tracking-wide">
                        Personalized
                      </div>
                      <iframe
                        src={personalizedBlob}
                        className="w-full h-full bg-white"
                        sandbox="allow-same-origin"
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-[10px] text-white/70 uppercase tracking-wide">
                        Original
                      </div>
                      <iframe
                        src={originalBlob}
                        className="w-full h-full bg-white"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                ) : (
                  <iframe
                    src={view === "personalized" ? personalizedBlob : originalBlob}
                    className="w-full h-full bg-white"
                    sandbox="allow-same-origin"
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-auto bg-black/40"
                style={{ height: "calc(70vh - 44px)" }}
              >
                <pre className="p-5 text-[11px] leading-relaxed text-white/70 font-mono whitespace-pre-wrap break-all">
                  {view === "original" ? originalHtml : personalizedHtml}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-wider text-white/50">
                Personalization Score
              </div>
              <Sparkles className="w-3.5 h-3.5 text-violet-300" />
            </div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-semibold gradient-text">
                {insights.personalizationScore}
              </div>
              <div className="text-white/40 text-sm mb-1">/ 100</div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400"
                initial={{ width: 0 }}
                animate={{ width: `${insights.personalizationScore}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
            <p className="text-xs text-white/50 mt-3 leading-relaxed">
              {insights.adSummary}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-blue-300" />
              <div className="text-[11px] uppercase tracking-wider text-white/50">
                Ad DNA
              </div>
            </div>
            <div className="space-y-2.5 text-xs">
              <Row label="Offer" value={adAnalysis.offer} />
              <Row label="Audience" value={adAnalysis.audience} />
              <Row label="Tone" value={adAnalysis.tone} />
              <Row label="Urgency" value={adAnalysis.urgencyLevel} />
              <div className="flex items-center gap-2 pt-1">
                {adAnalysis.dominantColors?.map((c, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-md border border-white/20"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              <div className="text-[11px] uppercase tracking-wider text-white/50">
                Changes Applied
              </div>
            </div>
            <div className="space-y-3">
              {insights.changesApplied?.slice(0, 5).map((c, i) => (
                <div key={i} className="text-xs border-l border-white/10 pl-3 py-0.5">
                  <div className="text-white/90 font-medium">{c.area}</div>
                  <div className="text-white/40 line-through truncate mt-0.5">
                    {c.before}
                  </div>
                  <div className="text-white/70 truncate">{c.after}</div>
                  <div className="text-[10px] text-violet-300/70 mt-1">{c.why}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <div className="text-[11px] uppercase tracking-wider text-white/50">
                CRO Upgrades
              </div>
            </div>
            <ul className="space-y-1.5">
              {insights.croImprovements?.map((i, idx) => (
                <li key={idx} className="text-xs text-white/70 flex gap-2">
                  <span className="text-emerald-300/70 mt-0.5">›</span>
                  {i}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <div className="text-white/40 w-16 shrink-0">{label}</div>
      <div className="text-white/85 flex-1">{value}</div>
    </div>
  );
}
