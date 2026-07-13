"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

export function AnimatedController() {
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const shouldAnimate = !shouldReduceMotion && !isMobile;

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 680px)");
    const updateMobileState = () => {
      setIsMobile(mobileQuery.matches);
    };

    updateMobileState();
    mobileQuery.addEventListener("change", updateMobileState);
    return () => mobileQuery.removeEventListener("change", updateMobileState);
  }, []);

  return (
    <motion.div
      className="controller-art"
      aria-hidden
      initial={shouldAnimate ? { opacity: 0, scale: 0.94, y: 20 } : false}
      animate={
        shouldAnimate
          ? { opacity: 1, scale: 1, y: [0, -8, 0] }
          : { opacity: 1 }
      }
      transition={
        shouldAnimate
          ? {
              opacity: { duration: 0.72, delay: 0.52 },
              scale: { duration: 0.72, delay: 0.52 },
              y: { duration: 8.5, repeat: Infinity, ease: "easeInOut" },
            }
          : { duration: 0 }
      }
    >
      <motion.span
        className="controller-breathing-glow"
        initial={false}
        animate={
          shouldAnimate
            ? { scale: [0.97, 1.05, 0.97], opacity: [0.24, 0.38, 0.24] }
            : { scale: 1, opacity: 0.28 }
        }
        transition={{
          duration: shouldAnimate ? 9.5 : 0,
          repeat: shouldAnimate ? Infinity : 0,
          ease: "easeInOut",
        }}
      />
      <motion.svg
        className="controller-product-svg"
        viewBox="0 0 760 470"
        role="img"
        animate={shouldAnimate ? { rotate: [-0.7, 0.85, -0.7] } : { rotate: 0 }}
        transition={{
          duration: shouldAnimate ? 10.5 : 0,
          repeat: shouldAnimate ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        <defs>
          <linearGradient id="dsShell" x1="122" x2="636" y1="78" y2="394">
            <stop offset="0" stopColor="#24222a" />
            <stop offset="0.42" stopColor="#121116" />
            <stop offset="1" stopColor="#050508" />
          </linearGradient>
          <linearGradient id="dsFace" x1="214" x2="546" y1="88" y2="296">
            <stop offset="0" stopColor="#2c2933" />
            <stop offset="0.5" stopColor="#121116" />
            <stop offset="1" stopColor="#060608" />
          </linearGradient>
          <linearGradient id="dsGrip" x1="120" x2="640" y1="160" y2="454">
            <stop offset="0" stopColor="#1d1b22" />
            <stop offset="0.56" stopColor="#08080b" />
            <stop offset="1" stopColor="#020204" />
          </linearGradient>
          <linearGradient id="dsRim" x1="142" x2="618" y1="88" y2="230">
            <stop offset="0" stopColor="rgba(255,255,255,0.52)" />
            <stop offset="0.32" stopColor="rgba(168,85,247,0.34)" />
            <stop offset="0.7" stopColor="rgba(255,255,255,0.16)" />
            <stop offset="1" stopColor="rgba(56,189,248,0.16)" />
          </linearGradient>
          <radialGradient id="dsStick" cx="48%" cy="38%" r="68%">
            <stop offset="0" stopColor="#34313b" />
            <stop offset="0.55" stopColor="#0f0e13" />
            <stop offset="1" stopColor="#020203" />
          </radialGradient>
          <radialGradient id="dsButton" cx="38%" cy="30%" r="68%">
            <stop offset="0" stopColor="#4a4652" />
            <stop offset="0.58" stopColor="#17151c" />
            <stop offset="1" stopColor="#050506" />
          </radialGradient>
        </defs>

        <ellipse className="controller-floor-shadow" cx="382" cy="414" rx="276" ry="38" />

        <path
          className="controller-grip left"
          d="M158 198c-48 28-78 122-82 188-2 39 18 64 49 61 48-5 81-66 111-119 18-31 27-54 20-78-9-32-50-77-98-52Z"
        />
        <path
          className="controller-grip right"
          d="M602 198c48 28 78 122 82 188 2 39-18 64-49 61-48-5-81-66-111-119-18-31-27-54-20-78 9-32 50-77 98-52Z"
        />

        <path
          className="controller-shell"
          d="M145 189c37-67 105-91 171-58 35 18 93 18 128 0 66-33 134-9 171 58 32 59 56 154 53 198-3 39-27 59-61 53-47-8-85-63-119-118-18-29-37-41-68-41h-80c-31 0-50 12-68 41-34 55-72 110-119 118-34 6-58-14-61-53-3-44 21-139 53-198Z"
        />
        <path
          className="controller-faceplate"
          d="M241 120c30 20 61 30 139 30s109-10 139-30c35 22 53 67 49 111-5 54-42 84-97 84H289c-55 0-92-30-97-84-4-44 14-89 49-111Z"
        />
        <path
          className="controller-top-rim"
          d="M168 188c36-51 91-70 145-43 38 19 96 19 134 0 54-27 109-8 145 43"
        />
        <path
          className="controller-center-seam"
          d="M257 132c22 62 27 118 10 171M503 132c-22 62-27 118-10 171"
        />

        <rect className="controller-touch" x="306" y="154" width="148" height="74" rx="24" />
        <path className="controller-touch-highlight" d="M325 166h110" />
        <path className="controller-light" d="M338 250h84" />

        <g className="controller-dpad">
          <rect x="173" y="203" width="36" height="52" rx="12" />
          <rect x="173" y="263" width="36" height="52" rx="12" />
          <rect x="126" y="250" width="52" height="36" rx="12" />
          <rect x="204" y="250" width="52" height="36" rx="12" />
        </g>

        <g className="controller-action-buttons">
          <circle cx="563" cy="210" r="22" />
          <circle cx="610" cy="257" r="22" />
          <circle cx="516" cy="257" r="22" />
          <circle cx="563" cy="304" r="22" />
          <path className="controller-symbol" d="M563 198l12 22h-24Z" />
          <circle className="controller-symbol" cx="610" cy="257" r="11" />
          <rect className="controller-symbol" x="505" y="246" width="22" height="22" rx="3" />
          <path className="controller-symbol" d="M553 294l20 20M573 294l-20 20" />
        </g>

        <g className="controller-sticks">
          <circle className="controller-stick-base" cx="278" cy="308" r="47" />
          <circle className="controller-stick" cx="278" cy="308" r="31" />
          <circle className="controller-stick-cap" cx="278" cy="308" r="19" />
          <circle className="controller-stick-base" cx="482" cy="308" r="47" />
          <circle className="controller-stick" cx="482" cy="308" r="31" />
          <circle className="controller-stick-cap" cx="482" cy="308" r="19" />
        </g>

        <g className="controller-speaker">
          <circle cx="350" cy="289" r="4" />
          <circle cx="370" cy="289" r="4" />
          <circle cx="390" cy="289" r="4" />
          <circle cx="410" cy="289" r="4" />
          <circle cx="360" cy="307" r="4" />
          <circle cx="380" cy="307" r="4" />
          <circle cx="400" cy="307" r="4" />
        </g>

        <path className="controller-ps-mark" d="M379 333v30M379 333c13 1 22 7 22 15 0 9-10 15-22 15M369 353c-16 3-27 8-27 14 0 9 27 10 62 2" />
        <path className="controller-rim-light" d="M151 192c38-64 103-86 165-55 36 18 92 18 128 0 62-31 127-9 165 55" />
        <path className="controller-bottom-highlight" d="M222 360c27 34 54 52 83 54h150c29-2 56-20 83-54" />
      </motion.svg>
    </motion.div>
  );
}
