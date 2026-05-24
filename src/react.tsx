import { memo, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  createAndroidCanvasFallbackStyle,
  createMeshGradient,
  createTurbulenceNoise,
  type AndroidCanvasFallback,
  type CanvasGrainStyle,
  type GrainGradientCSSOptions,
} from "./core.js";

export type { AndroidCanvasFallback } from "./core.js";

export interface GrainGradientReactOptions extends GrainGradientCSSOptions {
  androidCanvasFallback?: AndroidCanvasFallback;
  androidCanvasFallbackUserAgent?: string | null;
}

export interface GrainGradientProps extends GrainGradientReactOptions {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeSwirl = (swirl = 0) => {
  const value = clamp(swirl, 0, 100);
  const shift = value / 100;
  return {
    value,
    enabled: value > 0,
    scale: Number((1 + value * 0.004).toFixed(3)),
    rotate: Number((value * 0.12).toFixed(2)),
    offsetX: Number((shift * 12).toFixed(1)),
    offsetY: Number((shift * -10).toFixed(1)),
    backgroundSizeX: Number((100 + value * 0.55).toFixed(1)),
    backgroundSizeY: Number((100 + value * 0.4).toFixed(1)),
    backgroundPositionX: Number((50 + shift * 12).toFixed(1)),
    backgroundPositionY: Number((50 - shift * 10).toFixed(1)),
  };
};

const createSwirlTransform = (swirl: ReturnType<typeof normalizeSwirl>) =>
  swirl.enabled ? ` scale(${swirl.scale}) rotate(${swirl.rotate}deg)` : "";

export function useGrainGradient(options: GrainGradientReactOptions = {}) {
  const meshKey = JSON.stringify([
    options.colors,
    options.baseColor,
    options.intensity,
    options.saturation,
    options.blur,
    options.swirl,
  ]);
  const grainKey = JSON.stringify([
    options.seed,
    options.frequency,
    options.baseFrequency,
    options.numOctaves,
    options.contrast,
    options.width,
    options.height,
    options.size,
    options.stitchTiles,
  ]);
  const motionKey = JSON.stringify([
    options.motionPreset,
    options.motionSpeed,
    options.motionIntensity,
    options.opacity,
    options.blur,
    options.saturation,
    options.intensity,
    options.swirl,
  ]);
  const meshCss = useMemo(() => createMeshGradient(options), [meshKey]);
  const grainUrl = useMemo(() => createTurbulenceNoise(options), [grainKey]);
  const [canvasGrainStyle, setCanvasGrainStyle] = useState<CanvasGrainStyle | null>(null);

  useEffect(() => {
    setCanvasGrainStyle(createAndroidCanvasFallbackStyle(options));
  }, [grainKey, options.androidCanvasFallback, options.androidCanvasFallbackUserAgent]);

  const usesCanvasFallback = Boolean(canvasGrainStyle);
  const activeGrainUrl = canvasGrainStyle?.backgroundImage ?? grainUrl;
  const cssText = useMemo(() => `background-image: ${meshCss};`, [meshCss]);
  const motion = useMemo(() => {
    const allowed = new Set(["none", "drift", "breathe", "orbit"]);
    const preset = allowed.has(options.motionPreset ?? "none")
      ? (options.motionPreset ?? "none")
      : "none";
    const speed = Math.max(0, Math.min(100, options.motionSpeed ?? 0));
    const intensity = Math.max(0, Math.min(100, options.motionIntensity ?? 50));
    const enabled = preset !== "none" && speed > 0 && intensity > 0;
    const duration = Math.max(10, Math.round(56 - speed * 0.46));
    return {
      preset,
      enabled,
      duration,
      travel: 4 + intensity * 0.16,
      zoom: 1.12 + intensity * 0.0018,
      rotate: intensity * 0.12,
      grainShift: 2 + intensity * 0.08,
    };
  }, [motionKey]);
  const swirl = useMemo(() => normalizeSwirl(options.swirl), [options.swirl]);
  const swirlTransform = createSwirlTransform(swirl);
  const meshStyle = useMemo(
    () =>
      ({
        backgroundColor: options.baseColor ?? "#0b1020",
        backgroundImage: meshCss,
        backgroundSize: swirl.enabled
          ? `${swirl.backgroundSizeX}% ${swirl.backgroundSizeY}%`
          : "100% 100%",
        backgroundPosition: swirl.enabled
          ? `${swirl.backgroundPositionX}% ${swirl.backgroundPositionY}%`
          : undefined,
        backgroundRepeat: "no-repeat",
        filter: `blur(${clamp(options.blur ?? 42, 0, 80)}px) saturate(${clamp(options.saturation ?? options.intensity ?? 1.18, 0.2, 2.5)})`,
        transform: `scale(1.12)${swirlTransform}`,
        animation: motion.enabled
          ? `grain-gradient-react-mesh-${motion.preset} ${motion.duration}s ease-in-out infinite alternate`
          : undefined,
        "--gg-travel": `${motion.travel}%`,
        "--gg-zoom": `${motion.zoom}`,
        "--gg-rotate": `${motion.rotate}deg`,
        "--gg-swirl-x": `${swirl.offsetX}%`,
        "--gg-swirl-y": `${swirl.offsetY}%`,
        "--gg-swirl-scale": `${swirl.scale}`,
        "--gg-swirl-rotate": `${swirl.rotate}deg`,
      }) as CSSProperties,
    [
      meshCss,
      motion,
      options.baseColor,
      options.blur,
      options.intensity,
      options.saturation,
      swirl,
      swirlTransform,
    ],
  );
  const grainStyle = useMemo(
    () =>
      ({
        backgroundImage: activeGrainUrl,
        backgroundSize: canvasGrainStyle?.backgroundSize ?? "100% 100%",
        backgroundRepeat: canvasGrainStyle?.backgroundRepeat ?? "no-repeat",
        imageRendering: canvasGrainStyle?.imageRendering ?? "auto",
        opacity: options.opacity ?? 0.34,
        mixBlendMode: (options.blendMode ?? "overlay") as CSSProperties["mixBlendMode"],
        pointerEvents: "none" as const,
      }) as CSSProperties,
    [
      activeGrainUrl,
      usesCanvasFallback,
      canvasGrainStyle,
      options.opacity,
      options.blendMode,
      options.frequency,
      options.baseFrequency,
    ],
  );
  const motionCss = useMemo(() => {
    if (!motion.enabled) return "";
    return `@keyframes grain-gradient-react-mesh-drift { 0% { transform: scale(1.12) scale(var(--gg-swirl-scale)) rotate(var(--gg-swirl-rotate)) translate3d(calc(var(--gg-travel) * -1), calc(var(--gg-travel) * -1), 0); } 100% { transform: scale(var(--gg-zoom)) scale(var(--gg-swirl-scale)) rotate(var(--gg-swirl-rotate)) translate3d(var(--gg-travel), var(--gg-travel), 0); } } @keyframes grain-gradient-react-mesh-breathe { 0% { transform: scale(1.12) scale(var(--gg-swirl-scale)) rotate(var(--gg-swirl-rotate)); } 100% { transform: scale(var(--gg-zoom)) scale(var(--gg-swirl-scale)) rotate(var(--gg-swirl-rotate)); } } @keyframes grain-gradient-react-mesh-orbit { 0% { transform: scale(1.12) scale(var(--gg-swirl-scale)) rotate(var(--gg-swirl-rotate)) rotate(calc(var(--gg-rotate) * -1)) translate3d(calc(var(--gg-travel) * -1), var(--gg-travel), 0); background-position: calc(46% + var(--gg-swirl-x)) calc(54% + var(--gg-swirl-y)); } 100% { transform: scale(var(--gg-zoom)) scale(var(--gg-swirl-scale)) rotate(var(--gg-swirl-rotate)) rotate(var(--gg-rotate)) translate3d(var(--gg-travel), calc(var(--gg-travel) * -1), 0); background-position: calc(54% + var(--gg-swirl-x)) calc(46% + var(--gg-swirl-y)); } } @media (prefers-reduced-motion: reduce) { [data-grain-gradient-motion] { animation: none !important; } }`;
  }, [motion.enabled]);
  const rootStyle = useMemo(
    () => ({ position: "relative" as const, overflow: "hidden" as const }),
    [],
  );
  return { meshStyle, grainStyle, rootStyle, cssText, motionCss };
}

export const GrainGradient = memo(function GrainGradient(props: GrainGradientProps) {
  const { children, className, style, ...options } = props;
  const { meshStyle, grainStyle, rootStyle, motionCss } = useGrainGradient(options);
  return (
    <div className={className} style={{ ...rootStyle, ...style }}>
      {motionCss ? <style dangerouslySetInnerHTML={{ __html: motionCss }} /> : null}
      <div
        aria-hidden
        data-grain-gradient-motion
        style={{ ...meshStyle, position: "absolute", inset: "-18%", zIndex: 0 }}
      />
      <div
        aria-hidden
        data-grain-gradient-motion
        style={{ ...grainStyle, position: "absolute", inset: "-8%", zIndex: 1 }}
      />
      {children ?? null}
    </div>
  );
});
