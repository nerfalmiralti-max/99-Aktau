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
    duration: 44,
    staticOpacity: 0.72,
    animation: {
      x: [0, 12, -6, 8, 0],
      y: [0, 8, 12, -4, 0],
      scale: [1, 1.035, 0.99, 1.02, 1],
      opacity: [0.68, 0.76, 0.71, 0.74, 0.68],
    },
  },
  {
    className: "aurora-layer-cyan",
    duration: 56,
    staticOpacity: 0.58,
    animation: {
      x: [0, -10, 7, -4, 0],
      y: [0, 11, -6, 7, 0],
      scale: [1, 1.03, 1.01, 0.985, 1],
      opacity: [0.52, 0.6, 0.56, 0.59, 0.52],
    },
  },
  {
    className: "aurora-layer-depth",
    duration: 48,
    staticOpacity: 0.78,
    animation: {
      x: [0, 7, -8, 4, 0],
      y: [0, -6, 9, 3, 0],
      scale: [1, 1.025, 0.99, 1.015, 1],
      opacity: [0.74, 0.81, 0.76, 0.79, 0.74],
    },
  },
  {
    className: "aurora-layer-soft-light",
    duration: 60,
    staticOpacity: 0.16,
    animation: {
      x: [0, 6, -5, 3, 0],
      y: [0, -4, 7, 2, 0],
      scale: [1, 1.02, 0.99, 1.01, 1],
      opacity: [0.12, 0.18, 0.14, 0.17, 0.12],
    },
  },
];

export function AuroraHeroBackground() {
  const backgroundRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const sceneX = useSpring(pointerX, {
    stiffness: 34,
    damping: 20,
    mass: 0.35,
  });
  const sceneY = useSpring(pointerY, {
    stiffness: 34,
    damping: 20,
    mass: 0.35,
  });
  const shouldAnimate = !shouldReduceMotion && !isMobile;

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 680px)");
    const finePointerQuery = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    );
    const scene = backgroundRef.current?.parentElement;

    const updateMobileState = () => {
      setIsMobile(mobileQuery.matches);
      if (mobileQuery.matches || shouldReduceMotion) {
        pointerX.set(0);
        pointerY.set(0);
        scene?.style.setProperty("--controller-parallax-x", "0px");
        scene?.style.setProperty("--controller-parallax-y", "0px");
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (
        !scene ||
        mobileQuery.matches ||
        !finePointerQuery.matches ||
        shouldReduceMotion
      )
        return;

      const bounds = scene.getBoundingClientRect();
      const normalizedX = (event.clientX - bounds.left) / bounds.width - 0.5;
      const normalizedY = (event.clientY - bounds.top) / bounds.height - 0.5;
      pointerX.set(normalizedX * 12);
      pointerY.set(normalizedY * 8);
      scene.style.setProperty(
        "--controller-parallax-x",
        `${normalizedX * 8}px`,
      );
      scene.style.setProperty(
        "--controller-parallax-y",
        `${normalizedY * 6}px`,
      );
    };

    const resetParallax = () => {
      pointerX.set(0);
      pointerY.set(0);
      scene?.style.setProperty("--controller-parallax-x", "0px");
      scene?.style.setProperty("--controller-parallax-y", "0px");
    };

    updateMobileState();
    mobileQuery.addEventListener("change", updateMobileState);
    scene?.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    scene?.addEventListener("pointerleave", resetParallax, { passive: true });

    return () => {
      mobileQuery.removeEventListener("change", updateMobileState);
      scene?.removeEventListener("pointermove", handlePointerMove);
      scene?.removeEventListener("pointerleave", resetParallax);
    };
  }, [pointerX, pointerY, shouldReduceMotion]);

  return (
    <div
      className="aurora-hero-background"
      aria-hidden="true"
      ref={backgroundRef}
    >
      <motion.div
        className="aurora-parallax-scene"
        style={{ x: sceneX, y: sceneY }}
      >
        {auroraLayers
          .filter(
            ({ className }) =>
              !isMobile || className !== "aurora-layer-soft-light",
          )
          .map(({ animation, className, duration, staticOpacity }) => (
            <motion.span
              className={`aurora-layer ${className}`}
              initial={false}
              animate={
                shouldAnimate
                  ? animation
                  : { x: 0, y: 0, scale: 1, opacity: staticOpacity }
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
