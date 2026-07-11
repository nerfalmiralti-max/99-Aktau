"use client";

import { memo, useMemo, type CSSProperties } from "react";
import "./GradualBlur.css";

type GradualBlurProps = {
  position?: "top" | "bottom" | "left" | "right";
  strength?: number;
  height?: string;
  width?: string;
  divCount?: number;
  exponential?: boolean;
  opacity?: number;
  curve?: "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
  animated?: boolean;
  target?: "parent" | "page";
  zIndex?: number;
  className?: string;
};

const curveFunctions = {
  linear: (progress: number) => progress,
  bezier: (progress: number) => progress * progress * (3 - 2 * progress),
  "ease-in": (progress: number) => progress * progress,
  "ease-out": (progress: number) => 1 - Math.pow(1 - progress, 2),
  "ease-in-out": (progress: number) =>
    progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2,
};

const gradientDirections = {
  top: "to top",
  bottom: "to bottom",
  left: "to left",
  right: "to right",
};

function GradualBlurComponent({
  position = "bottom",
  strength = 2,
  height = "6rem",
  width,
  divCount = 5,
  exponential = false,
  opacity = 1,
  curve = "linear",
  animated = false,
  target = "parent",
  zIndex = 0,
  className = "",
}: GradualBlurProps) {
  const layerCount = Math.max(1, Math.round(divCount));
  const direction = gradientDirections[position];
  const isVertical = position === "top" || position === "bottom";

  const layers = useMemo(() => {
    const increment = 100 / layerCount;
    const curveFunction = curveFunctions[curve];

    return Array.from({ length: layerCount }, (_, index) => {
      const currentLayer = index + 1;
      const progress = curveFunction(currentLayer / layerCount);
      const blur = exponential
        ? Math.pow(2, progress * 4) * 0.0625 * strength
        : 0.0625 * (progress * layerCount + 1) * strength;
      const start = Math.round((increment * currentLayer - increment) * 10) / 10;
      const solidStart = Math.round(increment * currentLayer * 10) / 10;
      const solidEnd = Math.round((increment * currentLayer + increment) * 10) / 10;
      const end = Math.round((increment * currentLayer + increment * 2) * 10) / 10;
      const stops = [`transparent ${start}%`, `black ${solidStart}%`];

      if (solidEnd <= 100) stops.push(`black ${solidEnd}%`);
      if (end <= 100) stops.push(`transparent ${end}%`);

      return {
        "--gradual-blur-amount": `${blur.toFixed(3)}rem`,
        "--gradual-blur-mask": `linear-gradient(${direction}, ${stops.join(", ")})`,
      } as CSSProperties;
    });
  }, [curve, direction, exponential, layerCount, strength]);

  const containerStyle: CSSProperties = {
    position: target === "page" ? "fixed" : "absolute",
    width: isVertical ? width ?? "100%" : width ?? height,
    height: isVertical ? height : "100%",
    zIndex,
    opacity,
    [position]: 0,
    ...(isVertical ? { left: 0, right: 0 } : { top: 0, bottom: 0 }),
  };

  return (
    <div
      aria-hidden="true"
      className={`gradual-blur ${animated ? "is-animated" : ""} ${className}`.trim()}
      style={containerStyle}
    >
      {layers.map((style, index) => (
        <span className="gradual-blur-layer" key={index} style={style} />
      ))}
    </div>
  );
}

export const GradualBlur = memo(GradualBlurComponent);
