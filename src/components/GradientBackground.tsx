"use client";

import { motion } from "framer-motion";

export function GradientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="grid-bg absolute inset-0" />
      <motion.div
        className="glow-orb"
        style={{
          width: 620,
          height: 620,
          background:
            "radial-gradient(circle, rgba(167,139,250,0.55) 0%, rgba(167,139,250,0) 70%)",
          top: -200,
          left: -120,
        }}
        animate={{
          x: [0, 60, -20, 0],
          y: [0, 40, -30, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="glow-orb"
        style={{
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle, rgba(96,165,250,0.5) 0%, rgba(96,165,250,0) 70%)",
          top: 200,
          right: -100,
        }}
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 50, -20, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="glow-orb"
        style={{
          width: 460,
          height: 460,
          background:
            "radial-gradient(circle, rgba(244,114,182,0.35) 0%, rgba(244,114,182,0) 70%)",
          bottom: -160,
          left: "38%",
        }}
        animate={{
          x: [0, 40, -40, 0],
          y: [0, -30, 20, 0],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
