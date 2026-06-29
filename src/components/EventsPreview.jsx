/**
 * EventsPreview — Live component rendered inside the MacbookScroll screen
 * ────────────────────────────────────────────────────────────────────────
 * A scaled-down, self-contained version of the real EventTimeline.
 * It mirrors the exact data and visual language so the laptop-to-real-section
 * transition feels seamless.
 */

import React from "react";
import { motion } from "framer-motion";

/* ── Data mirrors EventTimeline.jsx ── */
const events = [
  {
    day: "15th June",
    title: "AWS 101 : The Architecture SandBox",
    time: "6:00pm – 8:00pm",
    icon: "dns",
    color: "#FF9900",
    points: [
      "Bridge software development and cloud computing.",
      "Virtualization under the hood — hypervisors & bare-metal.",
      "Networking: routers, subnets, gateways.",
      "Live traffic-routing & firewall simulation.",
    ],
    quiz: "Cloud Combat 1.0 — Live quiz",
  },
  {
    day: "17th June",
    title: "AWS 102 : Cloud Genesis",
    time: "6:00pm – 8:00pm",
    icon: "cloud",
    color: "#FF9900",
    points: [
      "Foundational cloud-computing concepts.",
      "Role of cloud platforms in scalable digital services.",
      "Insights into AWS services & emerging trends.",
    ],
    quiz: "Cloud Combat 2.0 — Live quiz",
  },
  {
    day: "18th June",
    title: "AWS 103 : The AI Cloud Stack",
    time: "6:00pm – 9:00pm",
    icon: "smart_toy",
    color: "#FF9900",
    points: [
      "ML on AWS — S3, SageMaker, EC2.",
      "Generative AI, Prompt Engineering, LLMs.",
      "Live app demo: Fake News Detection.",
    ],
  },
  {
    day: "19th June",
    title: "AWS 104 : Data Nexus",
    time: "6:00pm – 8:00pm",
    icon: "database",
    color: "#FF9900",
    points: [
      "Modern database systems & cloud data.",
      "Relational vs non-relational databases.",
      "Cloud-native data management workflows.",
    ],
    quiz: "Cloud Combat 3.0 — Case Study Activity",
  },
];

/* ── Preview Event Card ── */
function PreviewCard({ event, index }) {
  const isLeft = index % 2 === 0;

  return (
    <motion.div
      className="flex items-start gap-0 mb-6 relative"
      initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
    >
      {/* Left content */}
      {isLeft && (
        <div className="flex-1 text-right pr-4">
          <span
            className="text-[8px] font-bold tracking-widest uppercase block mb-0.5"
            style={{ fontFamily: "'Space Mono', monospace", color: "#FF9900" }}
          >
            {event.day}
          </span>
          <p
            className="text-[9px] font-bold uppercase leading-tight mb-1"
            style={{ fontFamily: "'Space Mono', monospace", color: "#f1dfd1" }}
          >
            {event.title}
          </p>
          <span
            className="text-[7px] px-2 py-0.5 inline-block mb-1.5"
            style={{
              fontFamily: "'Space Mono', monospace",
              color: "#FF9900",
              background: "rgba(255,153,0,0.1)",
              border: "1px solid rgba(255,153,0,0.25)",
            }}
          >
            {event.time}
          </span>
          <ul className="space-y-0.5 list-none p-0 m-0">
            {event.points.map((p, i) => (
              <li
                key={i}
                className="text-[7px] leading-relaxed flex items-start justify-end gap-1"
                style={{ color: "#dbc2ad" }}
              >
                <span>{p}</span>
                <span
                  className="w-1 h-1 flex-shrink-0 mt-[4px]"
                  style={{ background: "#FF9900" }}
                />
              </li>
            ))}
          </ul>
          {event.quiz && (
            <div className="mt-1.5 pt-1.5 border-t border-white/10">
              <span
                className="text-[6px] tracking-widest uppercase"
                style={{ fontFamily: "'Space Mono', monospace", color: "#ffc082" }}
              >
                {event.quiz}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Node */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10"
        style={{ border: "2px solid #FF9900", background: "#0A0C10" }}
      >
        <span className="material-symbols-outlined text-[12px]" style={{ color: "#FF9900" }}>
          {event.icon}
        </span>
      </div>

      {/* Right content */}
      {!isLeft && (
        <div className="flex-1 text-left pl-4">
          <span
            className="text-[8px] font-bold tracking-widest uppercase block mb-0.5"
            style={{ fontFamily: "'Space Mono', monospace", color: "#FF9900" }}
          >
            {event.day}
          </span>
          <p
            className="text-[9px] font-bold uppercase leading-tight mb-1"
            style={{ fontFamily: "'Space Mono', monospace", color: "#f1dfd1" }}
          >
            {event.title}
          </p>
          <span
            className="text-[7px] px-2 py-0.5 inline-block mb-1.5"
            style={{
              fontFamily: "'Space Mono', monospace",
              color: "#FF9900",
              background: "rgba(255,153,0,0.1)",
              border: "1px solid rgba(255,153,0,0.25)",
            }}
          >
            {event.time}
          </span>
          <ul className="space-y-0.5 list-none p-0 m-0">
            {event.points.map((p, i) => (
              <li
                key={i}
                className="text-[7px] leading-relaxed flex items-start gap-1"
                style={{ color: "#dbc2ad" }}
              >
                <span
                  className="w-1 h-1 flex-shrink-0 mt-[4px]"
                  style={{ background: "#FF9900" }}
                />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          {event.quiz && (
            <div className="mt-1.5 pt-1.5 border-t border-white/10">
              <span
                className="text-[6px] tracking-widest uppercase"
                style={{ fontFamily: "'Space Mono', monospace", color: "#ffc082" }}
              >
                {event.quiz}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Left spine spacer when right-side */}
      {!isLeft && <div className="absolute" />}
    </motion.div>
  );
}

/* ── Main EventsPreview ── */
export default function EventsPreview() {
  return (
    <div
      className="w-full h-full overflow-y-auto relative"
      style={{
        background: "#0A0C10",
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        scrollbarWidth: "none",
      }}
    >
      {/* Header */}
      <motion.div
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-2"
        style={{ background: "rgba(10,12,16,0.92)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(255,153,0,0.2)" }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="w-5 h-5 flex items-center justify-center"
          style={{ background: "#FF9900" }}
        >
          <span className="material-symbols-outlined text-[10px] text-black">developer_board</span>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ fontFamily: "'Space Mono', monospace", color: "#ffffff" }}
        >
          Events
        </span>
        <span
          className="text-[8px] ml-auto tracking-widest"
          style={{ fontFamily: "'Space Mono', monospace", color: "#FF9900" }}
        >
          AWS Week Event Timeline
        </span>
      </motion.div>

      {/* Eyebrow */}
      <motion.div
        className="px-4 pt-4 pb-2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <span className="w-1 h-1 rounded-full" style={{ background: "#FF9900" }} />
          <span
            className="text-[7px] tracking-[3px] uppercase"
            style={{ fontFamily: "'Space Mono', monospace", color: "#c1c6da" }}
          >
            4-Day Workshop Series
          </span>
        </div>
        <p
          className="text-[11px] font-bold uppercase tracking-wide leading-tight"
          style={{ fontFamily: "'Space Mono', monospace", color: "#f1dfd1" }}
        >
          AWS <span style={{ color: "#FF9900" }}>Week</span> Event Timeline
        </p>
      </motion.div>

      {/* Timeline body */}
      <div className="px-3 pb-6 relative">
        {/* Spine */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] opacity-50 z-0"
          style={{
            background: "repeating-linear-gradient(to bottom, #FF9900 0px, #FF9900 4px, transparent 4px, transparent 8px)",
          }}
        />

        {events.map((event, i) => (
          <PreviewCard key={event.day} event={event} index={i} />
        ))}

        {/* Footer */}
        <motion.div
          className="text-center pt-3 border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p
            className="text-[7px] tracking-wide"
            style={{ fontFamily: "'Inter', sans-serif", color: "#dbc2ad" }}
          >
            4 days · 4 technical sessions · Cloud Combat series ·{" "}
            <strong style={{ color: "#FF9900", textTransform: "uppercase" }}>aws week</strong>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
