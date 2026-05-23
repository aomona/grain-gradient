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
  const motionKey = JSON.stringify([options.motionPreset, options.motionSpeed, options.motionIntensity, options.opacity, options.blur, options.saturation, options.intensity]);
  const meshCss = useMemo(() => createMeshGradient(options), [meshKey]);
  const grainUrl = useMemo(() => createTurbulenceNoise(options), [grainKey]);
  const cssText = useMemo(() => `background-image: ${meshCss};`, [meshCss]);
  const motion = useMemo(() => {
    const allowed = new Set(["none", "drift", "breathe", "orbit"]);
    const preset = allowed.has(options.motionPreset ?? "none") ? options.motionPreset ?? "none" : "none";
    const speed = Math.max(0, Math.min(100, options.motionSpeed ?? 0));
    const intensity = Math.max(0, Math.min(100, options.motionIntensity ?? 50));
    const enabled = preset !== "none" && speed > 0 && intensity > 0;
    const duration = Math.max(10, Math.round(56 - speed * 0.46));
    return { preset, enabled, duration, travel: 4 + intensity * 0.16, zoom: 1.12 + intensity * 0.0018, rotate: intensity * 0.12, grainShift: 2 + intensity * 0.08 };
  }, [motionKey]);
  const meshStyle = useMemo(() => ({ backgroundColor: options.baseColor ?? "#0b1020", backgroundImage: meshCss, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", filter: `blur(${Math.max(0, Math.min(80, options.blur ?? 42))}px) saturate(${Math.max(0.2, Math.min(2.5, options.saturation ?? options.intensity ?? 1.18))})`, transform: "scale(1.12)", animation: motion.enabled ? `grain-gradient-react-mesh-${motion.preset} ${motion.duration}s ease-in-out infinite alternate` : undefined, "--gg-travel": `${motion.travel}%`, "--gg-zoom": `${motion.zoom}`, "--gg-rotate": `${motion.rotate}deg` } as CSSProperties), [meshCss, motion, options.baseColor, options.blur, options.intensity, options.saturation]);
  const grainStyle = useMemo(() => ({ backgroundImage: grainUrl, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", opacity: options.opacity ?? 0.34, mixBlendMode: (options.blendMode ?? "overlay") as CSSProperties["mixBlendMode"], pointerEvents: "none" as const } as CSSProperties), [grainUrl, options.opacity, options.blendMode]);
  const motionCss = useMemo(() => {
    if (!motion.enabled) return "";
    return `@keyframes grain-gradient-react-mesh-drift { 0% { transform: scale(1.12) translate3d(calc(var(--gg-travel) * -1), calc(var(--gg-travel) * -1), 0); background-position: 42% 48%; } 100% { transform: scale(var(--gg-zoom)) translate3d(var(--gg-travel), var(--gg-travel), 0); background-position: 58% 52%; } } @keyframes grain-gradient-react-mesh-breathe { 0% { transform: scale(1.12); } 100% { transform: scale(var(--gg-zoom)); } } @keyframes grain-gradient-react-mesh-orbit { 0% { transform: scale(1.12) rotate(calc(var(--gg-rotate) * -1)) translate3d(calc(var(--gg-travel) * -1), var(--gg-travel), 0); } 100% { transform: scale(var(--gg-zoom)) rotate(var(--gg-rotate)) translate3d(var(--gg-travel), calc(var(--gg-travel) * -1), 0); } } @media (prefers-reduced-motion: reduce) { [data-grain-gradient-motion] { animation: none !important; } }`;
  }, [motion.enabled]);
  const rootStyle = useMemo(() => ({ position: "relative" as const, overflow: "hidden" as const }), []);
  return { meshStyle, grainStyle, rootStyle, cssText, motionCss };
}

export const GrainGradient = memo(function GrainGradient(props: GrainGradientProps) {
  const { children, className, style, ...options } = props;
  const { meshStyle, grainStyle, rootStyle, motionCss } = useGrainGradient(options);
  return (
    <div className={className} style={{ ...rootStyle, ...style }}>
      {motionCss ? <style dangerouslySetInnerHTML={{ __html: motionCss }} /> : null}
      <div aria-hidden data-grain-gradient-motion style={{ ...meshStyle, position: "absolute", inset: "-18%", zIndex: 0 }} />
      <div aria-hidden data-grain-gradient-motion style={{ ...grainStyle, position: "absolute", inset: "-8%", zIndex: 1 }} />
      {children ?? null}
    </div>
  );
});
