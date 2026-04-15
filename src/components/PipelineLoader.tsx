"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Eye, Globe, Wand2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const steps = [
  { icon: Eye, label: "Analyzing ad creative", detail: "extracting offer, tone, and visual DNA" },
  { icon: Globe, label: "Fetching landing page", detail: "parsing DOM and content" },
  { icon: Wand2, label: "Personalizing with AI", detail: "applying CRO principles + message match" },
  { icon: Sparkles, label: "Finalizing preview", detail: "rendering your new page" },
];

export function PipelineLoader({ active }: { active: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setCurrentStep(0);
      return;
    }
    const intervals = [2200, 3200, 9000, 2500];
    let i = 0;
    const timers: NodeJS.Timeout[] = [];
    const advance = () => {
      if (i < steps.length - 1) {
        const t = setTimeout(() => {
          i++;
          setCurrentStep(i);
          advance();
        }, intervals[i]);
        timers.push(t);
      }
    };
    advance();
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="glass rounded-2xl p-5 space-y-3"
        >
          {steps.map((step, idx) => {
            const isDone = idx < currentStep;
            const isActive = idx === currentStep;
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex items-center gap-3">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {isDone ? (
                      <motion.div
                        key="done"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    ) : isActive ? (
                      <motion.div
                        key="active"
                        className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center relative"
                      >
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-violet-400 border-t-transparent"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                        />
                        <Icon className="w-4 h-4 text-white/80" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="pending"
                        className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center"
                      >
                        <Icon className="w-4 h-4 text-white/25" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium transition-colors ${
                      isDone || isActive ? "text-white" : "text-white/40"
                    }`}
                  >
                    {step.label}
                  </div>
                  <div
                    className={`text-xs transition-colors ${
                      isActive ? "text-white/60" : "text-white/30"
                    }`}
                  >
                    {step.detail}
                  </div>
                </div>
                {isActive && (
                  <motion.div
                    className="w-20 h-1 rounded-full overflow-hidden bg-white/5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-400 to-blue-400"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>
                )}
              </div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
