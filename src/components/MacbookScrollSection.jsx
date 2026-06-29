/**
 * MacbookScrollSection — Storytelling transition between Hero & Events
 * ────────────────────────────────────────────────────────────────────
 * Inserts the Aceternity MacbookScroll between <Hero /> and <CoreProtocols />
 * with:
 *  - Custom AWS Student Builder Group title
 *  - Live EventsPreview inside the laptop screen
 *  - AWS chip badge (bottom-left, scale hover)
 *  - Same dark cyberpunk background + grid lines as the rest of the site
 *  - Floating orange squares (continuing the Hero aesthetic)
 */

import React, { memo } from "react";
import { motion } from "framer-motion";
import { MacbookScroll } from "./ui/macbook-scroll";
import EventsPreview from "./EventsPreview";

/* ── AWS Chip Badge ── */
const AwsChipBadge = memo(() => (
  <motion.div
    whileHover={{ scale: 1.08 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className="flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none"
    style={{
      background: "rgba(10,12,16,0.85)",
      border: "1px solid rgba(255,153,0,0.35)",
      backdropFilter: "blur(6px)",
    }}
  >
    {/* AWS smile logo SVG */}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      fill="none"
      className="w-4 h-4"
    >
      {/* Cloud shape */}
      <path
        d="M40 14C28.95 14 20 22.95 20 34c0 1.38.14 2.73.4 4.04C13.46 39.6 8 45.46 8 52.5 8 59.96 14.04 66 21.5 66h37C65.57 66 72 59.57 72 51.5c0-6.88-4.76-12.66-11.18-14.17A19.95 19.95 0 0040 14z"
        fill="#232F3E"
      />
      {/* AWS orange smile/arrow */}
      <path
        d="M25 48c4.17 3.33 9.58 5.33 15.5 5.33 5.92 0 11.33-2 15.5-5.33"
        stroke="#FF9900"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M52 45l4 3-2 2"
        stroke="#FF9900"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* "aws" text */}
      <text
        x="50%"
        y="38"
        textAnchor="middle"
        fontSize="13"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
        fill="#FF9900"
        letterSpacing="1"
      >
        aws
      </text>
    </svg>
    <span
      className="text-[7px] font-bold tracking-widest uppercase"
      style={{ fontFamily: "'Space Mono', monospace", color: "#FF9900" }}
    >
      AWS SBG
    </span>
  </motion.div>
));

/* ── Floating orange square (reused from Hero) ── */
const FloatingBlock = memo(({ className, delay = 0 }) => (
  <motion.div
    animate={{
      y: [0, -15, 0],
      scale: [1, 1.05, 1],
      boxShadow: [
        "0px 0px 0px 0px rgba(255,153,0,0)",
        "10px 20px 30px -10px rgba(255,153,0,0.4)",
        "0px 0px 0px 0px rgba(255,153,0,0)",
      ],
    }}
    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay }}
    className={className}
  />
));

/* ── Section title ── */
const SectionTitle = () => (
  <div className="text-center">
    {/* main heading */}
    <h2
      className="font-bold uppercase leading-tight mb-4 text-white"
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: "clamp(22px, 4vw, 38px)",
        letterSpacing: "0.06em",
      }}
    >
      Experience <span style={{ color: "#FF9900" }}>AWS</span> Student Builder Group
    </h2>

    {/* stacked keywords */}
    <div className="flex flex-col items-center gap-0 mb-5">
      {["Build.", "Learn.", "Deploy.", "Experience."].map((word, i) => (
        <motion.span
          key={word}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="font-bold uppercase leading-tight"
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "clamp(18px, 3vw, 28px)",
            letterSpacing: "0.08em",
            color: i === 3 ? "#FF9900" : "#ffffff",
          }}
        >
          {word}
        </motion.span>
      ))}
    </div>

    {/* subtitle */}
    <p
      className="max-w-md mx-auto leading-relaxed"
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "13px",
        color: "#dbc2ad",
        letterSpacing: "0.02em",
      }}
    >
      Scroll to preview our flagship events before exploring them.
    </p>
  </div>
);

/* ── MacbookScrollSection (default export) ── */
export default function MacbookScrollSection() {
  return (
    <section
      className="relative w-full overflow-hidden hidden md:block"
      style={{ background: "#0A0C10" }}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Floating orange squares — continue Hero aesthetic */}
      <FloatingBlock
        className="absolute top-20 right-[15%] w-[60px] h-[60px] bg-[#FF9900] hidden md:block z-0"
        delay={0.5}
      />
      <FloatingBlock
        className="absolute top-40 right-[8%] w-[30px] h-[30px] bg-[#FF9900] hidden md:block z-0"
        delay={2}
      />
      <FloatingBlock
        className="absolute top-32 left-[6%] w-[40px] h-[40px] bg-[#FF9900] hidden md:block z-0"
        delay={1.2}
      />

      {/* Content */}
      <div className="relative z-10 w-full overflow-hidden dark">
        <MacbookScroll
          badge={<AwsChipBadge />}
          showGradient={false}
        >
          <EventsPreview />
        </MacbookScroll>
      </div>
    </section>
  );
}
