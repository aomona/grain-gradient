import { memo, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createMeshGradient, createTurbulenceNoise, type GrainGradientCSSOptions } from "./core.js";

export type AndroidCanvasFallback = "auto" | "on" | "off";

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
const canvasNoiseCache = new Map<string, string>();

const getBrowserUserAgent = () => typeof navigator === "undefined" ? "" : navigator.userAgent;

const isAndroidChrome = (userAgent = getBrowserUserAgent()) => {
  const ua = userAgent;
  return /Android/i.test(ua) && /Chrome\//i.test(ua) && !/(; wv|Version\/|EdgA|OPR|SamsungBrowser|Firefox|CriOS)/i.test(ua);
};

const shouldUseCanvasFallback = (fallback: AndroidCanvasFallback | undefined, userAgent?: string | null) => {
  if (fallback === "on") return true;
  if (fallback === "off") return false;
  return isAndroidChrome(userAgent ?? getBrowserUserAgent());
};

const canvasNoiseKey = (options: GrainGradientReactOptions = {}) => {
  const seed = Math.floor(clamp(options.seed ?? 1, 0, 9999));
  const frequency = clamp(options.frequency ?? options.baseFrequency ?? 1.25, 0.04, 2.4);
  const contrast = clamp(options.contrast ?? 1.7, 1.0, 2.5);
  return JSON.stringify([seed, frequency, contrast]);
};

const createCanvasNoise = (options: GrainGradientReactOptions = {}) => {
  if (typeof document === "undefined") return null;

  const cacheKey = canvasNoiseKey(options);
  const cached = canvasNoiseCache.get(cacheKey);
  if (cached) return cached;

  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  try {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return null;

    const image = context.createImageData(size, size);
    let value = Math.floor(clamp(options.seed ?? 1, 0, 9999)) >>> 0;
    const nextRandom = () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
    const frequency = clamp(options.frequency ?? options.baseFrequency ?? 1.25, 0.04, 2.4);
    const density = (frequency - 0.04) / (2.4 - 0.04);
    const contrast = clamp((options.contrast ?? 1.7) / 2.5, 0.35, 1);
    const blockSize = Math.max(1, Math.round(2.25 - density * 1.25));

    for (let y = 0; y < size; y += blockSize) {
      for (let x = 0; x < size; x += blockSize) {
        const bit = nextRandom() > 0.5 ? 1 : 0;
        const channel = Math.round(128 + (bit ? 127 : -127) * contrast);
        for (let yy = 0; yy < blockSize; yy++) {
          for (let xx = 0; xx < blockSize; xx++) {
            const px = x + xx;
            const py = y + yy;
            if (px >= size || py >= size) continue;
            const offset = (py * size + px) * 4;
            image.data[offset] = channel;
            image.data[offset + 1] = channel;
            image.data[offset + 2] = channel;
            image.data[offset + 3] = 255;
          }
        }
      }
    }

    context.putImageData(image, 0, 0);
    const url = `url("${canvas.toDataURL("image/png")}")`;
    canvasNoiseCache.set(cacheKey, url);
    return url;
  } catch {
    return null;
  }
};

const canvasBackgroundSize = (options: GrainGradientReactOptions = {}) => {
  const frequency = clamp(options.frequency ?? options.baseFrequency ?? 1.25, 0.04, 2.4);
  const density = (frequency - 0.04) / (2.4 - 0.04);
  return `${Math.round(720 - density * 580)}px ${Math.round(720 - density * 580)}px`;
};

export function useGrainGradient(options: GrainGradientReactOptions = {}) {
  const meshKey = JSON.stringify([options.colors, options.baseColor, options.intensity, options.saturation, options.blur]);
  const grainKey = JSON.stringify([options.seed, options.frequency, options.baseFrequency, options.numOctaves, options.contrast, options.width, options.height, options.size, options.stitchTiles]);
  const motionKey = JSON.stringify([options.motionPreset, options.motionSpeed, options.motionIntensity, options.opacity, options.blur, options.saturation, options.intensity]);
  const meshCss = useMemo(() => createMeshGradient(options), [meshKey]);
  const grainUrl = useMemo(() => createTurbulenceNoise(options), [grainKey]);
  const [canvasGrainUrl, setCanvasGrainUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldUseCanvasFallback(options.androidCanvasFallback, options.androidCanvasFallbackUserAgent)) {
      setCanvasGrainUrl(null);
      return;
    }
    setCanvasGrainUrl(createCanvasNoise(options));
  }, [grainKey, options.androidCanvasFallback, options.androidCanvasFallbackUserAgent]);

  const usesCanvasFallback = Boolean(canvasGrainUrl);
  const activeGrainUrl = canvasGrainUrl ?? grainUrl;
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
  const meshStyle = useMemo(() => ({ backgroundColor: options.baseColor ?? "#0b1020", backgroundImage: meshCss, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", filter: `blur(${clamp(options.blur ?? 42, 0, 80)}px) saturate(${clamp(options.saturation ?? options.intensity ?? 1.18, 0.2, 2.5)})`, transform: "scale(1.12)", animation: motion.enabled ? `grain-gradient-react-mesh-${motion.preset} ${motion.duration}s ease-in-out infinite alternate` : undefined, "--gg-travel": `${motion.travel}%`, "--gg-zoom": `${motion.zoom}`, "--gg-rotate": `${motion.rotate}deg` } as CSSProperties), [meshCss, motion, options.baseColor, options.blur, options.intensity, options.saturation]);
  const grainStyle = useMemo(() => ({ backgroundImage: activeGrainUrl, backgroundSize: usesCanvasFallback ? canvasBackgroundSize(options) : "100% 100%", backgroundRepeat: usesCanvasFallback ? "repeat" : "no-repeat", imageRendering: usesCanvasFallback ? "pixelated" : "auto", opacity: options.opacity ?? 0.34, mixBlendMode: (options.blendMode ?? "overlay") as CSSProperties["mixBlendMode"], pointerEvents: "none" as const } as CSSProperties), [activeGrainUrl, usesCanvasFallback, options.opacity, options.blendMode, options.frequency, options.baseFrequency]);
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
