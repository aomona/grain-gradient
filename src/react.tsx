import { memo, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createMeshGradient, createTurbulenceNoise, type GrainGradientCSSOptions } from "./core.js";

export interface GrainGradientProps extends GrainGradientCSSOptions {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function useGrainGradient(options: GrainGradientCSSOptions = {}) {
  const meshKey = JSON.stringify([options.colors, options.baseColor, options.intensity, options.saturation, options.blur]);
  const grainKey = JSON.stringify([options.seed, options.frequency, options.baseFrequency, options.numOctaves, options.contrast, options.width, options.height, options.size, options.stitchTiles]);
  const meshCss = useMemo(() => createMeshGradient(options), [meshKey]);
  const grainUrl = useMemo(() => createTurbulenceNoise(options), [grainKey]);
  const cssText = useMemo(() => `background-image: ${meshCss};`, [meshCss]);
  const meshStyle = useMemo(() => ({ backgroundColor: options.baseColor ?? "#0b1020", backgroundImage: meshCss, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", filter: `blur(${Math.max(0, Math.min(80, options.blur ?? 42))}px) saturate(${Math.max(0.2, Math.min(2.5, options.saturation ?? options.intensity ?? 1.18))})`, transform: "scale(1.12)" }), [meshCss, options.baseColor, options.blur, options.intensity, options.saturation]);
  const grainStyle = useMemo(() => ({ backgroundImage: grainUrl, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", opacity: options.opacity ?? 0.34, mixBlendMode: (options.blendMode ?? "overlay") as CSSProperties["mixBlendMode"], pointerEvents: "none" as const }), [grainUrl, options.opacity, options.blendMode]);
  const rootStyle = useMemo(() => ({ position: "relative" as const, overflow: "hidden" as const }), []);
  return { meshStyle, grainStyle, rootStyle, cssText };
}

export const GrainGradient = memo(function GrainGradient(props: GrainGradientProps) {
  const { children, className, style, ...options } = props;
  const { meshStyle, grainStyle, rootStyle } = useGrainGradient(options);
  return (
    <div className={className} style={{ ...rootStyle, ...style }}>
      <div aria-hidden style={{ ...meshStyle, position: "absolute", inset: 0, zIndex: 0 }} />
      <div aria-hidden style={{ ...grainStyle, position: "absolute", inset: 0, zIndex: 1 }} />
      {children ?? null}
    </div>
  );
});
