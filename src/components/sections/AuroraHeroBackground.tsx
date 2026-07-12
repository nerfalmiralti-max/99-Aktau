"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type TargetAndTransition,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import "./AuroraHeroBackground.css";

type AuroraLayer = {
  className: string;
  duration: number;
  animation: TargetAndTransition;
  staticOpacity: number;
};

const auroraLayers: AuroraLayer[] = [
  {
    className: "aurora-layer-violet",
    duration: 38,
    staticOpacity: 0.72,
    animation: {
      x: [0, 16, -7, 10, 0],
      y: [0, 10, 18, -5, 0],
      scale: [1, 1.05, 0.98, 1.03, 1],
      rotate: [0, 1.2, -0.8, 0.6, 0],
      opacity: [0.66, 0.78, 0.7, 0.75, 0.66],
    },
  },
  {
    className: "aurora-layer-cyan",
    duration: 46,
    staticOpacity: 0.58,
    animation: {
      x: [0, -13, 8, -5, 0],
      y: [0, 16, -8, 9, 0],
      scale: [1, 1.04, 1.01, 0.97, 1],
      rotate: [0, -1, 0.7, -0.5, 0],
      opacity: [0.5, 0.62, 0.55, 0.6, 0.5],
    },
  },
  {
    className: "aurora-layer-depth",
    duration: 32,
    staticOpacity: 0.78,
    animation: {
      x: [0, 9, -11, 5, 0],
      y: [0, -8, 12, 4, 0],
      scale: [1, 1.035, 0.985, 1.02, 1],
      rotate: [0, 0.6, -0.7, 0.4, 0],
      opacity: [0.72, 0.82, 0.75, 0.8, 0.72],
    },
  },
];

export function AuroraHeroBackground() {
  const backgroundRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const sceneX = useSpring(pointerX, { stiffness: 34, damping: 20, mass: 0.35 });
  const sceneY = useSpring(pointerY, { stiffness: 34, damping: 20, mass: 0.35 });
  const shouldAnimate = !shouldReduceMotion && !isMobile;

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 680px)");
    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const scene = backgroundRef.current?.parentElement;

    const updateMobileState = () => {
      setIsMobile(mobileQuery.matches);
      if (mobileQuery.matches) {
        pointerX.set(0);
        pointerY.set(0);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!scene || mobileQuery.matches || !finePointerQuery.matches || shouldReduceMotion) return;

      const bounds = scene.getBoundingClientRect();
      const normalizedX = (event.clientX - bounds.left) / bounds.width - 0.5;
      const normalizedY = (event.clientY - bounds.top) / bounds.height - 0.5;
      pointerX.set(normalizedX * 12);
      pointerY.set(normalizedY * 8);
    };

    const resetParallax = () => {
      pointerX.set(0);
      pointerY.set(0);
    };

    updateMobileState();
    mobileQuery.addEventListener("change", updateMobileState);
    scene?.addEventListener("pointermove", handlePointerMove, { passive: true });
    scene?.addEventListener("pointerleave", resetParallax, { passive: true });

    return () => {
      mobileQuery.removeEventListener("change", updateMobileState);
      scene?.removeEventListener("pointermove", handlePointerMove);
      scene?.removeEventListener("pointerleave", resetParallax);
    };
  }, [pointerX, pointerY, shouldReduceMotion]);

  return (
    <div className="aurora-hero-background" aria-hidden="true" ref={backgroundRef}>
      <motion.div className="aurora-parallax-scene" style={{ x: sceneX, y: sceneY }}>
        {auroraLayers.map(({ animation, className, duration, staticOpacity }) => (
          <motion.span
            className={`aurora-layer ${className}`}
            initial={false}
            animate={
              shouldAnimate
                ? animation
                : { x: 0, y: 0, scale: 1, rotate: 0, opacity: staticOpacity }
            }
            transition={{
              duration: shouldAnimate ? duration : 0,
              ease: "easeInOut",
              repeat: shouldAnimate ? Infinity : 0,
            }}
            key={className}
          />
        ))}
      </motion.div>
      <span className="aurora-noise" />
      <span className="aurora-bottom-fade" />
    </div>
  );
}
