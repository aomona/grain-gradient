import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { GrainGradientOptions } from "./core.js";
import {
  createWebGLMeshRenderer,
  type ReplaceableWebGLMeshRenderer,
  type WebGLMeshGradientOptions,
} from "./webgl.js";

export interface GrainGradientProps extends GrainGradientOptions, WebGLMeshGradientOptions {
  className?: string;
  style?: CSSProperties;
  canvasStyle?: CSSProperties;
  children?: ReactNode;
}

export { presets } from "./core.js";
export type { GrainGradientOptions, GrainGradientPreset, GrainGradientPresetName } from "./core.js";

const createGrainGradientOptionKey = (parts: readonly unknown[]) => JSON.stringify(parts);

export function useGrainGradient(options: GrainGradientOptions & WebGLMeshGradientOptions = {}) {
  const rootStyle = useMemo(
    () =>
      ({
        position: "relative" as const,
        overflow: "hidden" as const,
        backgroundColor: options.baseColor ?? "#0b1020",
      }) satisfies CSSProperties,
    [options.baseColor],
  );

  const canvasStyle = useMemo(
    () =>
      ({
        position: "absolute" as const,
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none" as const,
      }) satisfies CSSProperties,
    [],
  );

  return { rootStyle, canvasStyle };
}

export const GrainGradient = memo(function GrainGradient(props: GrainGradientProps) {
  const { children, className, style, canvasStyle, ...options } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ReplaceableWebGLMeshRenderer | null>(null);
  const appliedWebglKeyRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [webglReady, setWebglReady] = useState(false);
  const { rootStyle, canvasStyle: defaultCanvasStyle } = useGrainGradient(options);

  const webglKey = createGrainGradientOptionKey([
    options.colors,
    options.baseColor,
    options.intensity,
    options.saturation,
    options.swirl,
    options.motionPreset,
    options.motionSpeed,
    options.motionIntensity,
    options.seed,
    options.frequency,
    options.baseFrequency,
    options.contrast,
    options.opacity,
    options.maxPixelRatio,
    options.motionMaxPixelRatio,
    options.fps,
    options.pauseWhenHidden,
  ]);
  const webglKeyRef = useRef(webglKey);
  webglKeyRef.current = webglKey;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let activeRenderer: ReplaceableWebGLMeshRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const stopAndDestroy = () => {
      activeRenderer?.destroy();
      activeRenderer = null;
      rendererRef.current = null;
      appliedWebglKeyRef.current = null;
    };

    const handleResize = () => activeRenderer?.resize();

    const createRenderer = () => {
      stopAndDestroy();
      const renderer = createWebGLMeshRenderer(canvas, optionsRef.current);
      if (!renderer) {
        setWebglReady(false);
        return;
      }
      activeRenderer = renderer;
      rendererRef.current = renderer;
      appliedWebglKeyRef.current = webglKeyRef.current;
      renderer.start();
      setWebglReady(true);
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stopAndDestroy();
      setWebglReady(false);
    };

    const handleContextRestored = (event: Event) => {
      event.preventDefault();
      createRenderer();
    };

    resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(handleResize);
    resizeObserver?.observe(canvas);
    if (!resizeObserver) window.addEventListener("resize", handleResize);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    createRenderer();

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", handleResize);
      stopAndDestroy();
      setWebglReady(false);
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || appliedWebglKeyRef.current === webglKey) return;
    renderer.replaceOptions(options);
    appliedWebglKeyRef.current = webglKey;
  }, [webglKey]);

  return (
    <div className={className} style={{ ...rootStyle, ...style }}>
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          ...defaultCanvasStyle,
          opacity: webglReady ? 1 : 0,
          ...canvasStyle,
        }}
      />
      {children ?? null}
    </div>
  );
});

export type {
  ReplaceableWebGLMeshRenderer,
  WebGLMeshGradientOptions,
  WebGLMeshRenderer,
} from "./webgl.js";
export {
  createWebGLMeshRenderer,
  isWebGLAvailable,
  resolveWebGLMeshGradientOptions,
} from "./webgl.js";
