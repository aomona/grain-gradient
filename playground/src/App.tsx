import { useEffect, useMemo, useRef, useState } from "react";
import type { MotionPreset } from "../../src/core.js";
import { presets } from "../../src/core.js";
import {
  createWebGLMeshRenderer,
  type WebGLMeshGradientOptions,
  type WebGLMeshRenderer,
} from "../../src/webgl.js";

type PresetName = keyof typeof presets;

interface PlaygroundState {
  preset: PresetName;
  colors: string[];
  baseColor: string;
  intensity: number;
  saturation: number;
  swirl: number;
  opacity: number;
  frequency: number;
  contrast: number;
  seed: number;
  motionPreset: MotionPreset;
  motionSpeed: number;
  motionIntensity: number;
}

interface FeedbackState {
  state: "ready" | "error";
  title: string;
  text: string;
}

const presetNames = Object.keys(presets) as PresetName[];
const initialPreset: PresetName = "Aurora Citrus";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const format = (value: number, digits = 2) => {
  const next = Number(value).toFixed(digits);
  return next.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

const defaultMotionPreset = (): MotionPreset =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "none"
    : "drift";

const createInitialState = (): PlaygroundState => ({
  preset: initialPreset,
  colors: [...presets[initialPreset].colors],
  baseColor: presets[initialPreset].baseColor,
  intensity: 1.45,
  saturation: 1.28,
  swirl: 30,
  opacity: 0.2,
  frequency: 1.25,
  contrast: 1.7,
  seed: 1,
  motionPreset: defaultMotionPreset(),
  motionSpeed: 38,
  motionIntensity: 46,
});

export function App() {
  const [state, setState] = useState<PlaygroundState>(createInitialState);
  const [feedback, setFeedback] = useState<FeedbackState>({
    state: "ready",
    title: "Ready",
    text: "Preview is live.",
  });
  const [ready, setReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<WebGLMeshRenderer | null>(null);
  const rendererOptionsRef = useRef<WebGLMeshGradientOptions>({});

  const set = <Key extends keyof PlaygroundState>(key: Key, value: PlaygroundState[Key]) =>
    setState((previous) => ({ ...previous, [key]: value }));

  const rendererOptions = useMemo(
    () => ({
      colors: state.colors,
      baseColor: state.baseColor,
      intensity: state.intensity,
      saturation: state.saturation,
      swirl: state.swirl,
      seed: state.seed,
      frequency: state.frequency,
      contrast: state.contrast,
      opacity: state.opacity,
      motionPreset: state.motionPreset,
      motionSpeed: state.motionSpeed,
      motionIntensity: state.motionIntensity,
      maxPixelRatio: 1.25,
      fps: 45,
    }),
    [state],
  );
  rendererOptionsRef.current = rendererOptions;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let activeRenderer: WebGLMeshRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const stopAndDestroy = () => {
      activeRenderer?.destroy();
      activeRenderer = null;
      rendererRef.current = null;
    };

    const handleResize = () => activeRenderer?.resize();

    const createRenderer = () => {
      stopAndDestroy();
      const renderer = createWebGLMeshRenderer(canvas, rendererOptionsRef.current);
      if (!renderer) {
        setReady(false);
        setFeedback({
          state: "error",
          title: "WebGL unavailable",
          text: "This browser could not create a WebGL context.",
        });
        return;
      }
      activeRenderer = renderer;
      rendererRef.current = renderer;
      renderer.resize();
      renderer.start();
      setReady(true);
      setFeedback({ state: "ready", title: "Ready", text: "Preview is live." });
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stopAndDestroy();
      setReady(false);
      setFeedback({
        state: "error",
        title: "WebGL context lost",
        text: "The WebGL context was lost. Restoring if the browser allows it...",
      });
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
      setReady(false);
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.update(rendererOptions);
  }, [rendererOptions]);

  const applyPreset = (name: PresetName) =>
    setState((previous) => ({
      ...previous,
      preset: name,
      colors: [...presets[name].colors],
      baseColor: presets[name].baseColor,
    }));

  const syncSeed = (value: string) => set("seed", clamp(Math.round(Number(value) || 0), 0, 9999));

  const resetPreset = () => {
    const next = createInitialState();
    next.colors = [...presets[initialPreset].colors];
    next.baseColor = presets[initialPreset].baseColor;
    setState(next);
  };

  const motionSpeedLabel =
    state.motionPreset === "none" || state.motionSpeed === 0 ? "static" : `${state.motionSpeed}`;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <h1>grain-gradient playground</h1>
          <p>Live preview for WebGL shader mesh + grain motion.</p>
        </div>

        <section className="controls card" aria-label="Gradient controls">
          <div className="field">
            <div className="label-row">
              <label htmlFor="preset">Preset</label>
            </div>
            <select
              id="preset"
              value={state.preset}
              onChange={(event) => applyPreset(event.target.value as PresetName)}
            >
              {presetNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <div className="label-row">
              <label>Colors</label>
              <span className="value">4</span>
            </div>
            <div className="colors">
              {state.colors.map((color, index) => (
                <label key={index} className="color-field">
                  <span className="value">Color {index + 1}</span>
                  <input
                    type="color"
                    aria-label={`Color ${index + 1}`}
                    value={color}
                    onChange={(event) =>
                      set(
                        "colors",
                        state.colors.map((current, current_index) =>
                          current_index === index ? event.target.value : current,
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="intensity">Intensity</label>
              <span className="value">{format(state.intensity, 2)}</span>
            </div>
            <input
              id="intensity"
              type="range"
              min={0.2}
              max={2.5}
              step={0.01}
              value={state.intensity}
              onChange={(event) => set("intensity", Number(event.target.value))}
            />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="saturation">Saturation</label>
              <span className="value">{format(state.saturation, 2)}</span>
            </div>
            <input
              id="saturation"
              type="range"
              min={0.2}
              max={2.5}
              step={0.01}
              value={state.saturation}
              onChange={(event) => set("saturation", Number(event.target.value))}
            />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="swirl">Swirl</label>
              <span className="value">{state.swirl}</span>
            </div>
            <input
              id="swirl"
              type="range"
              min={0}
              max={100}
              step={1}
              value={state.swirl}
              onChange={(event) => set("swirl", Number(event.target.value))}
            />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="motionPreset">Motion preset</label>
            </div>
            <select
              id="motionPreset"
              value={state.motionPreset}
              onChange={(event) => set("motionPreset", event.target.value as MotionPreset)}
            >
              <option value="none">Static</option>
              <option value="drift">Slow drift</option>
              <option value="breathe">Soft breathe</option>
              <option value="orbit">Gentle orbit</option>
            </select>
            <p className="motion-help">
              Pick one preset for movement, then fine-tune speed and intensity.
            </p>
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="motionSpeed">Motion speed</label>
              <span className="value">{motionSpeedLabel}</span>
            </div>
            <input
              id="motionSpeed"
              type="range"
              min={0}
              max={100}
              step={1}
              value={state.motionSpeed}
              onChange={(event) => set("motionSpeed", Number(event.target.value))}
            />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="motionIntensity">Motion intensity</label>
              <span className="value">{state.motionIntensity}</span>
            </div>
            <input
              id="motionIntensity"
              type="range"
              min={0}
              max={100}
              step={1}
              value={state.motionIntensity}
              onChange={(event) => set("motionIntensity", Number(event.target.value))}
            />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="opacity">Grain opacity</label>
              <span className="value">{format(state.opacity, 2)}</span>
            </div>
            <input
              id="opacity"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.opacity}
              onChange={(event) => set("opacity", Number(event.target.value))}
            />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="frequency">Grain frequency</label>
              <span className="value">{format(state.frequency, 2)}</span>
            </div>
            <input
              id="frequency"
              type="range"
              min={0.04}
              max={2.4}
              step={0.01}
              value={state.frequency}
              onChange={(event) => set("frequency", Number(event.target.value))}
            />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="contrast">Grain contrast</label>
              <span className="value">{format(state.contrast, 2)}</span>
            </div>
            <input
              id="contrast"
              type="range"
              min={1}
              max={2.5}
              step={0.01}
              value={state.contrast}
              onChange={(event) => set("contrast", Number(event.target.value))}
            />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="seedRange">Seed</label>
              <span className="value">{state.seed}</span>
            </div>
            <div className="seed-grid">
              <input
                id="seedRange"
                type="range"
                min={0}
                max={9999}
                step={1}
                value={state.seed}
                onChange={(event) => syncSeed(event.target.value)}
              />
              <input
                id="seedNumber"
                type="number"
                min={0}
                max={9999}
                step={1}
                value={state.seed}
                onChange={(event) => syncSeed(event.target.value)}
              />
            </div>
          </div>

          <div className="button-row">
            <button type="button" className="secondary" onClick={resetPreset}>
              Reset preset
            </button>
          </div>

          <div className="feedback" data-state={feedback.state} aria-live="polite">
            <strong>{feedback.title}</strong>
            <p>{feedback.text}</p>
          </div>
        </section>
      </aside>

      <main
        className="preview"
        aria-label="Live background preview"
        style={{ background: state.baseColor }}
      >
        <canvas ref={canvasRef} className="preview-canvas" aria-hidden="true" data-ready={ready} />
      </main>
    </div>
  );
}
