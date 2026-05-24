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
import { createSwirlTransform, normalizeMotion, normalizeSwirl } from "./internal.js";

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
const createGrainGradientOptionKey = (parts: readonly unknown[]) => JSON.stringify(parts);

export function useGrainGradient(options: GrainGradientReactOptions = {}) {
  const meshKey = createGrainGradientOptionKey([
    options.colors,
    options.baseColor,
    options.intensity,
    options.saturation,
    options.blur,
    options.swirl,
  ]);
  const grainKey = createGrainGradientOptionKey([
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
  const motionKey = createGrainGradientOptionKey([
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
  const motion = useMemo(() => normalizeMotion(options), [motionKey]);
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
