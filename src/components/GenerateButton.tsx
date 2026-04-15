"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function GenerateButton({ onClick, disabled, loading }: Props) {
  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.015 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.985 } : {}}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "relative w-full group overflow-hidden rounded-2xl px-6 py-5 font-medium text-sm transition-all",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "border border-white/15"
      )}
    >
      <span
        className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-blue-500 transition-opacity"
        style={{ opacity: disabled ? 0.35 : 1 }}
      />
      <motion.span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500"
        animate={loading ? { opacity: [0.6, 1, 0.6] } : { opacity: 0 }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
      <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.25)_50%,transparent_70%)] bg-[length:200%_100%] opacity-0 group-hover:opacity-100 group-hover:animate-[shimmer_1.8s_linear_infinite]" />
      <span className="relative flex items-center justify-center gap-2.5 text-white">
        {loading ? (
          <>
            <motion.span
              className="w-4 h-4 rounded-full border-2 border-white/70 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            Personalizing with AI…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Personalized Page
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </span>
    </motion.button>
  );
}
