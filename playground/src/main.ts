import type { MotionPreset } from "../../src/core.js";
import { presets } from "../../src/core.js";
import {
  createWebGLMeshRenderer,
  type WebGLMeshGradientOptions,
  type WebGLMeshRenderer,
} from "../../src/webgl.js";
import "./styles.css";

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

const initialPreset: PresetName = "Aurora Citrus";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const format = (value: number, digits = 2) => {
  const next = Number(value).toFixed(digits);
  return next.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

const defaultMotionPreset = (): MotionPreset =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "none" : "drift";

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

const select = <ElementType extends Element>(selector: string) => {
  const element = document.querySelector<ElementType>(selector);
  if (!element) throw new Error(`Missing ${selector} element`);
  return element;
};

const valueFor = (control: HTMLElement) => {
  const value = control.closest(".field")?.querySelector<HTMLElement>(".label-row .value");
  if (!value) throw new Error(`Missing value for #${control.id}`);
  return value;
};

const preset = select<HTMLSelectElement>("#preset");
const colorInputs = Array.from(
  document.querySelectorAll<HTMLInputElement>('.colors input[type="color"]'),
);
const intensity = select<HTMLInputElement>("#intensity");
const saturation = select<HTMLInputElement>("#saturation");
const swirl = select<HTMLInputElement>("#swirl");
const motionPreset = select<HTMLSelectElement>("#motionPreset");
const motionSpeed = select<HTMLInputElement>("#motionSpeed");
const motionIntensity = select<HTMLInputElement>("#motionIntensity");
const opacity = select<HTMLInputElement>("#opacity");
const frequency = select<HTMLInputElement>("#frequency");
const contrast = select<HTMLInputElement>("#contrast");
const seedRange = select<HTMLInputElement>("#seedRange");
const seedNumber = select<HTMLInputElement>("#seedNumber");
const reset = select<HTMLButtonElement>(".button-row .secondary");
const feedback = select<HTMLElement>(".feedback");
const feedbackTitle = select<HTMLElement>(".feedback strong");
const feedbackText = select<HTMLElement>(".feedback p");
const preview = select<HTMLElement>(".preview");
const canvas = select<HTMLCanvasElement>(".preview-canvas");

const intensityValue = valueFor(intensity);
const saturationValue = valueFor(saturation);
const swirlValue = valueFor(swirl);
const motionSpeedValue = valueFor(motionSpeed);
const motionIntensityValue = valueFor(motionIntensity);
const opacityValue = valueFor(opacity);
const frequencyValue = valueFor(frequency);
const contrastValue = valueFor(contrast);
const seedValue = valueFor(seedRange);

let state = createInitialState();
let renderer: WebGLMeshRenderer | null = null;

const rendererOptions = (): WebGLMeshGradientOptions => ({
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
});

const setFeedback = (next: FeedbackState) => {
  feedback.dataset.state = next.state;
  feedbackTitle.textContent = next.title;
  feedbackText.textContent = next.text;
};

const setReady = (ready: boolean) => {
  canvas.dataset.ready = String(ready);
};

const motionSpeedLabel = () =>
  state.motionPreset === "none" || state.motionSpeed === 0 ? "static" : `${state.motionSpeed}`;

const syncControls = () => {
  preset.value = state.preset;
  colorInputs.forEach((input, index) => {
    input.value = state.colors[index] ?? state.colors[0] ?? "#ffffff";
  });
  intensity.value = String(state.intensity);
  intensityValue.textContent = format(state.intensity, 2);
  saturation.value = String(state.saturation);
  saturationValue.textContent = format(state.saturation, 2);
  swirl.value = String(state.swirl);
  swirlValue.textContent = String(state.swirl);
  motionPreset.value = state.motionPreset;
  motionSpeed.value = String(state.motionSpeed);
  motionSpeedValue.textContent = motionSpeedLabel();
  motionIntensity.value = String(state.motionIntensity);
  motionIntensityValue.textContent = String(state.motionIntensity);
  opacity.value = String(state.opacity);
  opacityValue.textContent = format(state.opacity, 2);
  frequency.value = String(state.frequency);
  frequencyValue.textContent = format(state.frequency, 2);
  contrast.value = String(state.contrast);
  contrastValue.textContent = format(state.contrast, 2);
  seedRange.value = String(state.seed);
  seedNumber.value = String(state.seed);
  seedValue.textContent = String(state.seed);
  preview.style.background = state.baseColor;
};

const updateRenderer = () => renderer?.update(rendererOptions());

const bindNumberControl = (
  input: HTMLInputElement,
  setValue: (value: number) => void,
  value: HTMLElement,
  renderValue: (value: number) => string = String,
) => {
  input.addEventListener("input", () => {
    const next = Number(input.value);
    setValue(next);
    value.textContent = renderValue(next);
    updateRenderer();
  });
};

preset.addEventListener("change", () => {
  const name = preset.value as PresetName;
  state.preset = name;
  state.colors = [...presets[name].colors];
  state.baseColor = presets[name].baseColor;
  colorInputs.forEach((input, index) => {
    input.value = state.colors[index] ?? state.colors[0] ?? "#ffffff";
  });
  preview.style.background = state.baseColor;
  updateRenderer();
});

colorInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    state.colors = state.colors.map((color, colorIndex) =>
      colorIndex === index ? input.value : color,
    );
    updateRenderer();
  });
});

bindNumberControl(
  intensity,
  (value) => {
    state.intensity = value;
  },
  intensityValue,
  (value) => format(value, 2),
);
bindNumberControl(
  saturation,
  (value) => {
    state.saturation = value;
  },
  saturationValue,
  (value) => format(value, 2),
);
bindNumberControl(
  swirl,
  (value) => {
    state.swirl = value;
  },
  swirlValue,
);

motionPreset.addEventListener("change", () => {
  state.motionPreset = motionPreset.value as MotionPreset;
  motionSpeedValue.textContent = motionSpeedLabel();
  updateRenderer();
});

bindNumberControl(
  motionSpeed,
  (value) => {
    state.motionSpeed = value;
  },
  motionSpeedValue,
  () => motionSpeedLabel(),
);
bindNumberControl(
  motionIntensity,
  (value) => {
    state.motionIntensity = value;
  },
  motionIntensityValue,
);
bindNumberControl(
  opacity,
  (value) => {
    state.opacity = value;
  },
  opacityValue,
  (value) => format(value, 2),
);
bindNumberControl(
  frequency,
  (value) => {
    state.frequency = value;
  },
  frequencyValue,
  (value) => format(value, 2),
);
bindNumberControl(
  contrast,
  (value) => {
    state.contrast = value;
  },
  contrastValue,
  (value) => format(value, 2),
);

const syncSeed = (value: string) => {
  state.seed = clamp(Math.round(Number(value) || 0), 0, 9999);
  seedRange.value = String(state.seed);
  seedNumber.value = String(state.seed);
  seedValue.textContent = String(state.seed);
  updateRenderer();
};

seedRange.addEventListener("input", () => syncSeed(seedRange.value));
seedNumber.addEventListener("input", () => syncSeed(seedNumber.value));

reset.addEventListener("click", () => {
  state = createInitialState();
  syncControls();
  updateRenderer();
});

const stopAndDestroy = () => {
  renderer?.destroy();
  renderer = null;
};

const createRenderer = () => {
  stopAndDestroy();
  const nextRenderer = createWebGLMeshRenderer(canvas, rendererOptions());
  if (!nextRenderer) {
    setReady(false);
    setFeedback({
      state: "error",
      title: "WebGL unavailable",
      text: "This browser could not create a WebGL context.",
    });
    return;
  }

  renderer = nextRenderer;
  renderer.start();
  setReady(true);
  setFeedback({ state: "ready", title: "Ready", text: "Preview is live." });
};

const handleResize = () => renderer?.resize();
const resizeObserver =
  typeof ResizeObserver === "undefined" ? null : new ResizeObserver(handleResize);

resizeObserver?.observe(canvas);
if (!resizeObserver) window.addEventListener("resize", handleResize);

canvas.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  stopAndDestroy();
  setReady(false);
  setFeedback({
    state: "error",
    title: "WebGL context lost",
    text: "The WebGL context was lost. Restoring if the browser allows it...",
  });
});

canvas.addEventListener("webglcontextrestored", (event) => {
  event.preventDefault();
  createRenderer();
});

syncControls();
createRenderer();
