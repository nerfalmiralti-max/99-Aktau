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
      initial={shouldAnimate ? { opacity: 0, scale: 0.92, y: 24 } : false}
      animate={
        shouldAnimate
          ? { opacity: 1, scale: 1, y: [0, -14, 0] }
          : { opacity: 1 }
      }
      transition={
        shouldAnimate
          ? {
              opacity: { duration: 0.8, delay: 0.6 },
              scale: { duration: 0.8, delay: 0.6 },
              y: { duration: 5.8, repeat: Infinity, ease: "easeInOut" },
            }
          : { duration: 0 }
      }
    >
      <motion.span
        className="controller-breathing-glow"
        initial={false}
        animate={
          shouldAnimate
            ? { scale: [0.96, 1.08, 0.96], opacity: [0.35, 0.55, 0.35] }
            : { scale: 1, opacity: 0.42 }
        }
        transition={{
          duration: shouldAnimate ? 8 : 0,
          repeat: shouldAnimate ? Infinity : 0,
          ease: "easeInOut",
        }}
      />
      <motion.svg
        viewBox="0 0 560 360"
        role="img"
        animate={shouldAnimate ? { rotate: [-1.4, 1.6, -1.4] } : { rotate: 0 }}
        transition={{
          duration: shouldAnimate ? 7.2 : 0,
          repeat: shouldAnimate ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        <defs>
          <linearGradient id="controllerLine" x1="72" x2="488" y1="74" y2="312">
            <stop offset="0" stopColor="#e879ff" />
            <stop offset="0.45" stopColor="#7c5cff" />
            <stop offset="1" stopColor="#35d5ff" />
          </linearGradient>
          <filter
            id="controllerGlow"
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0.55 0 1 0 0 0.08 0 0 1 0 1 0 0 0 0.95 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          className="controller-shadow"
          d="M150 122c38-26 78-17 104 9 12 12 37 14 52 0 30-27 68-35 104-10 42 30 65 107 75 164 6 34-11 57-40 57-39 0-70-41-91-73-11-17-27-25-48-25h-52c-21 0-37 8-48 25-21 32-52 73-91 73-29 0-46-23-40-57 10-58 32-132 75-163Z"
        />
        <path
          className="controller-shell"
          d="M150 122c38-26 78-17 104 9 12 12 37 14 52 0 30-27 68-35 104-10 42 30 65 107 75 164 6 34-11 57-40 57-39 0-70-41-91-73-11-17-27-25-48-25h-52c-21 0-37 8-48 25-21 32-52 73-91 73-29 0-46-23-40-57 10-58 32-132 75-163Z"
        />
        <path
          className="controller-line"
          d="M150 122c38-26 78-17 104 9 12 12 37 14 52 0 30-27 68-35 104-10 42 30 65 107 75 164"
          filter="url(#controllerGlow)"
        />
        <rect
          className="controller-touch"
          x="226"
          y="139"
          width="108"
          height="52"
          rx="18"
        />
        <circle className="controller-stick" cx="214" cy="237" r="34" />
        <circle className="controller-stick" cx="347" cy="237" r="34" />
        <path className="controller-cross" d="M157 194h52M183 168v52" />
        <circle className="controller-button cyan" cx="406" cy="170" r="15" />
        <rect
          className="controller-button magenta"
          x="372"
          y="205"
          width="28"
          height="28"
          rx="6"
        />
        <circle className="controller-button pink" cx="440" cy="205" r="15" />
        <path className="controller-button blue" d="M406 250l22 28h-44Z" />
        <path className="controller-light" d="M245 211h70" />
      </motion.svg>
    </motion.div>
  );
}
