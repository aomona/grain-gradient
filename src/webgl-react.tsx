import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  createAndroidCanvasFallbackStyle,
  createGrainLayerStyle,
  createTurbulenceNoise,
  type AndroidCanvasFallback,
  type CanvasGrainStyle,
} from "./core.js";
import { useGrainGradient, type GrainGradientReactOptions } from "./react.js";
import {
  createWebGLMeshRenderer,
  type WebGLMeshGradientOptions,
  type WebGLMeshRenderer,
} from "./webgl.js";

export interface WebGLGrainGradientProps
  extends GrainGradientReactOptions, WebGLMeshGradientOptions {
  androidCanvasFallback?: AndroidCanvasFallback;
  androidCanvasFallbackUserAgent?: string | null;
  className?: string;
  style?: CSSProperties;
  canvasStyle?: CSSProperties;
  children?: ReactNode;
}

const createGrainGradientOptionKey = (parts: readonly unknown[]) => JSON.stringify(parts);

export const WebGLGrainGradient = memo(function WebGLGrainGradient(props: WebGLGrainGradientProps) {
  const { children, className, style, canvasStyle, ...options } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<WebGLMeshRenderer | null>(null);
  const [webglReady, setWebglReady] = useState(false);
  const { meshStyle, rootStyle } = useGrainGradient({ ...options, motionPreset: "none" });
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
  const webglKey = createGrainGradientOptionKey([
    options.colors,
    options.baseColor,
    options.intensity,
    options.saturation,
    options.swirl,
    options.motionPreset,
    options.motionSpeed,
    options.motionIntensity,
    options.maxPixelRatio,
    options.fps,
    options.pauseWhenHidden,
  ]);
  const grainUrl = useMemo(() => createTurbulenceNoise(options), [grainKey]);
  const svgGrainLayerStyle = useMemo(() => createGrainLayerStyle(options), [grainKey]);
  const [canvasGrainStyle, setCanvasGrainStyle] = useState<CanvasGrainStyle | null>(null);

  useEffect(() => {
    setCanvasGrainStyle(createAndroidCanvasFallbackStyle(options));
  }, [grainKey, options.androidCanvasFallback, options.androidCanvasFallbackUserAgent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createWebGLMeshRenderer(canvas, options);
    rendererRef.current = renderer;
    if (!renderer) {
      setWebglReady(false);
      return;
    }

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => renderer.resize());
    resizeObserver?.observe(canvas);
    const handleResize = () => renderer.resize();
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      renderer.stop();
      rendererRef.current = null;
      setWebglReady(false);
    };
    if (!resizeObserver) window.addEventListener("resize", handleResize);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    renderer.start();
    setWebglReady(true);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", handleResize);
      renderer.destroy();
      rendererRef.current = null;
      setWebglReady(false);
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.update(options);
  }, [webglKey]);

  const grainStyle = useMemo(
    () =>
      ({
        backgroundImage: canvasGrainStyle?.backgroundImage ?? grainUrl,
        backgroundSize: canvasGrainStyle?.backgroundSize ?? svgGrainLayerStyle.backgroundSize,
        backgroundRepeat: canvasGrainStyle?.backgroundRepeat ?? svgGrainLayerStyle.backgroundRepeat,
        imageRendering: canvasGrainStyle?.imageRendering ?? "auto",
        opacity: options.opacity ?? 0.2,
        mixBlendMode: (options.blendMode ?? "overlay") as CSSProperties["mixBlendMode"],
        pointerEvents: "none" as const,
        contain: "paint",
      }) as CSSProperties,
    [canvasGrainStyle, grainUrl, options.blendMode, options.opacity, svgGrainLayerStyle],
  );

  return (
    <div className={className} style={{ ...rootStyle, ...style }}>
      <div
        aria-hidden
        style={{
          ...meshStyle,
          position: "absolute",
          inset: "-18%",
          zIndex: 0,
          opacity: webglReady ? 0 : 1,
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          opacity: webglReady ? 1 : 0,
          pointerEvents: "none",
          ...canvasStyle,
        }}
      />
      <div aria-hidden style={{ ...grainStyle, position: "absolute", inset: "-8%", zIndex: 1 }} />
      {children ?? null}
    </div>
  );
});

export type { WebGLMeshGradientOptions, WebGLMeshRenderer } from "./webgl.js";
export {
  createWebGLMeshRenderer,
  isWebGLAvailable,
  resolveWebGLMeshGradientOptions,
} from "./webgl.js";
