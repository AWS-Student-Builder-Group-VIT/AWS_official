/**
 * MacbookScroll — Aceternity UI (modified for AWS Student Builder Group)
 * ─────────────────────────────────────────────────────────────────────
 * Changes from original Aceternity:
 *  • `children` prop instead of `src` — renders a live React component on screen
 *  • Default badge is AWS chip (Peerlist badge removed)
 *  • showGradient still supported
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ─── MacbookScroll (main export) ────────────────────────────────────────────
export const MacbookScroll = ({ title, badge, children, showGradient = true }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const scaleX = useTransform(scrollYProgress, [0, 0.3], [1.2, isMobile ? 1 : 1.5]);
  const scaleY = useTransform(scrollYProgress, [0, 0.3], [0.6, isMobile ? 1 : 1.5]);
  // translateY: only nudge slightly at the very end — exitScale handles the real exit
  const translate = useTransform(scrollYProgress, [0, 0.4, 1.0], [0, 0, 150]);
  const rotate = useTransform(scrollYProgress, [0.1, 0.12, 0.3], [-28, -28, 0]);
  const textTransform = useTransform(scrollYProgress, [0, 0.3], [0, 100]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  // Zoom toward viewer — screen expands to fill viewport before Events section
  const exitScale = useTransform(scrollYProgress, [0.55, 1.0], [1, 3.8]);

  return (
    <div
      ref={ref}
      className="min-h-[200vh] flex flex-col items-center justify-start py-0 shrink-0 [perspective:800px] transform md:scale-100 scale-[0.45] sm:scale-60 overflow-hidden"
    >
      <motion.h2
        style={{ translateY: textTransform, opacity: textOpacity }}
        className="dark:text-white text-neutral-800 text-3xl font-bold mb-20 text-center"
      >
        {title}
      </motion.h2>

      {/* Zoom wrapper — scales the whole laptop toward viewer on scroll exit */}
      <motion.div
        style={{ scale: exitScale }}
        className="flex flex-col items-center"
      >
        {/* Lid */}
        <Lid
          scaleX={scaleX}
          scaleY={scaleY}
          rotate={rotate}
          translate={translate}
          badge={badge}
        >
          {children}
        </Lid>

        {/* Base / keyboard chassis */}
        <div className="h-[26rem] w-[38rem] bg-gray-200 dark:bg-[#272729] rounded-2xl overflow-hidden relative -z-10">
          <div className="absolute inset-x-0 mx-auto w-[40%] h-6 top-0 bg-[#050505] rounded-b-3xl z-10" />
          <div
            style={{ boxShadow: "0px 0px 1px 1px rgba(255, 153, 0, 0.1) inset" }}
            className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#111] to-[#0A0A0A] overflow-hidden flex flex-col justify-between pt-8 pb-4"
          >
            <Keypad />
            <Trackpad />
          </div>
        </div>
      </motion.div>

      {showGradient && (
        <div className="h-40 w-full absolute bottom-0 inset-x-0 bg-gradient-to-t dark:from-black from-white via-white dark:via-black to-transparent z-50" />
      )}
    </div>
  );
};

// ─── Lid ────────────────────────────────────────────────────────────────────
export const Lid = ({ scaleX, scaleY, rotate, translate, badge, children }) => {
  return (
    <div className="relative [perspective:800px]">
      {/* Static back panel visible before opening */}
      <div
        style={{ transform: "perspective(800px) rotateX(-25deg) translateZ(0px)" }}
        className="h-[14rem] w-[38rem] bg-[#010101] rounded-2xl p-2 relative"
      >
        <div
          style={{ boxShadow: "0px 2px 0px 2px #171717 inset" }}
          className="absolute inset-0 bg-[#010101] rounded-2xl flex items-center justify-center"
        >
          <span className="text-white/10">
            <AppleLogo />
          </span>
        </div>
      </div>

      {/* Animated lid that opens */}
      <motion.div
        style={{
          scaleX,
          scaleY,
          rotateX: rotate,
          translateY: translate,
          transformStyle: "preserve-3d",
          transformOrigin: "top",
        }}
        className="h-[28rem] w-[38rem] absolute inset-0 bg-[#010101] rounded-2xl p-2"
      >
        <div className="absolute inset-0 bg-[#010101] rounded-2xl" />
        <div className="bg-[#080808] w-full h-full rounded-2xl flex flex-col items-center justify-start relative overflow-hidden">
          {/* Camera dot */}
          <div className="absolute top-2 z-20 w-2 h-2 rounded-full bg-[#1a1a1a]" />

          {/* ── Live React component rendered on screen ── */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            {children}
          </div>

          {/* AWS chip badge bottom-left */}
          {badge && (
            <div className="absolute bottom-3 left-3 z-30">
              {badge}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Trackpad ───────────────────────────────────────────────────────────────
export const Trackpad = () => (
  <div
    className="w-[55%] mx-auto h-44 rounded-xl bg-[#0D0D0D]"
    style={{ boxShadow: "0px 0px 1px 1px rgba(255,255,255,0.05) inset" }}
  />
);

// ─── Keypad ─────────────────────────────────────────────────────────────────
export const Keypad = () => (
  <div className="h-full rounded-2xl bg-[#0A0A0A]">
    {/* fn + esc row */}
    <Row>
      <KBtn className="w-12 items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">
        <span className="block">esc</span>
      </KBtn>
      {Array.from({ length: 12 }).map((_, i) => <KBtn key={`fn-${i}`} />)}
      <KBtn className="w-12 items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">
        <span className="block">del</span>
      </KBtn>
    </Row>

    {/* number row */}
    <Row>
      {["`","1","2","3","4","5","6","7","8","9","0","-","="].map(k => (
        <KBtn key={k}><span className="block">{k}</span></KBtn>
      ))}
      <KBtn className="w-12 items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">
        <span className="block">delete</span>
      </KBtn>
    </Row>

    {/* QWERTY row */}
    <Row>
      <KBtn className="w-12 items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">
        <span className="block">tab</span>
      </KBtn>
      {["Q","W","E","R","T","Y","U","I","O","P","[","]","\\"].map(k => (
        <KBtn key={k}><span className="block">{k}</span></KBtn>
      ))}
    </Row>

    {/* ASDF row */}
    <Row>
      <KBtn className="w-[3.4rem] items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">
        <span className="block">caps lock</span>
      </KBtn>
      {["A","S","D","F","G","H","J","K","L",";","'"].map(k => (
        <KBtn key={k}><span className="block">{k}</span></KBtn>
      ))}
      <KBtn className="w-[3.5rem] items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">
        <span className="block">return</span>
      </KBtn>
    </Row>

    {/* ZXCV row */}
    <Row>
      <KBtn className="w-[4.4rem] items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">
        <span className="block">shift</span>
      </KBtn>
      {["Z","X","C","V","B","N","M",",",".","/"].map(k => (
        <KBtn key={k}><span className="block">{k}</span></KBtn>
      ))}
      <KBtn className="w-[4.4rem] items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">
        <span className="block">shift</span>
      </KBtn>
    </Row>

    {/* Bottom row — uses justify-start + flex-1 spacebar to avoid over-stretching */}
    <div className="flex flex-row items-end justify-start gap-[3px] mb-[3px] w-full px-[0.75rem]">
      <KBtn className="" childrenClassName="h-full justify-between py-[4px]">
        <div className="flex justify-end w-full pr-1">
          <span className="text-[7px] block">fn</span>
        </div>
        <div className="flex justify-start w-full pl-1">
          <span className="text-[5px]">⌘</span>
        </div>
      </KBtn>
      <KBtn className=""><ChevronUp className="h-[6px] w-[6px]" /></KBtn>
      <KBtn className="w-8">
        <div className="flex flex-col items-center justify-center w-full">
          <ChevronUp className="h-[6px] w-[6px] rotate-180" />
          <ChevronUp className="h-[6px] w-[6px]" />
        </div>
      </KBtn>
      <div className="p-[0.5px] rounded-[4px] bg-white/[0.2] shadow-xl shadow-white flex-1">
        <div
          style={{ boxShadow: "0px -0.5px 2px 0 rgba(255,255,255,0.3) inset, -0.5px 0px 2px 0 rgba(255,255,255,0.2) inset" }}
          className="h-8 w-full bg-[#0A0A0A] rounded-[3.5px]"
        />
      </div>
      <KBtn className="w-8">
        <div className="flex flex-col items-center justify-center w-full">
          <ChevronUp className="h-[6px] w-[6px] rotate-180" />
          <ChevronUp className="h-[6px] w-[6px]" />
        </div>
      </KBtn>
      <KBtn className=""><ChevronUp className="h-[6px] w-[6px] -rotate-90" /></KBtn>
      <KBtn className=""><ChevronUp className="h-[6px] w-[6px] rotate-90" /></KBtn>
    </div>
  </div>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const KBtn = ({ className, children, childrenClassName, backlit = true }) => (
  <div className={cn("p-[0.5px] rounded-[4px]", backlit && "bg-white/[0.2] shadow-xl shadow-white")}>
    <div
      style={{ boxShadow: "0px -0.5px 2px 0 rgba(255,255,255,0.3) inset, -0.5px 0px 2px 0 rgba(255,255,255,0.2) inset" }}
      className={cn("h-8 w-8 bg-[#0A0A0A] rounded-[3.5px] flex items-center justify-center", className)}
    >
      <div className={cn("flex w-full flex-col items-center justify-center text-neutral-200 text-[7px]", childrenClassName)}>
        {children}
      </div>
    </div>
  </div>
);

export const Row = ({ children }) => (
  <div className="flex flex-row items-end justify-between gap-[3px] mb-[3px] w-full px-[0.75rem]">
    {children}
  </div>
);

const ChevronUp = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.999 10.172 7.207 14.965l-1.414-1.414 6.206-6.207 6.208 6.207-1.414 1.414z" />
  </svg>
);

const AppleLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 814 1000" fill="currentColor">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
  </svg>
);
