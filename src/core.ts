export type GrainGradientPresetName =
  | "Aurora Citrus"
  | "Blue Hour"
  | "Candy Fog"
  | "Forest Glass"
  | "Midnight Bloom";

export interface TurbulenceNoiseOptions {
  seed?: number;
  frequency?: number;
  baseFrequency?: number;
  numOctaves?: number;
  stitchTiles?: boolean;
  contrast?: number;
  opacity?: number;
  width?: number;
  height?: number;
  size?: number;
}

export type AndroidCanvasFallback = "auto" | "on" | "off";

export interface AndroidCanvasFallbackOptions extends TurbulenceNoiseOptions {
  androidCanvasFallback?: AndroidCanvasFallback;
  androidCanvasFallbackUserAgent?: string | null;
}

export interface CanvasGrainStyle {
  backgroundImage: string;
  backgroundSize: string;
  backgroundRepeat: "repeat";
  imageRendering: "pixelated";
}

export interface MeshGradientOptions {
  colors?: string[];
  baseColor?: string;
  intensity?: number;
  blur?: number;
  saturation?: number;
  swirl?: number;
}

export type MotionPreset = "none" | "drift" | "breathe" | "orbit";

export interface MotionOptions {
  motionPreset?: MotionPreset;
  motionSpeed?: number;
  motionIntensity?: number;
}

export interface GrainGradientCSSOptions
  extends MeshGradientOptions, TurbulenceNoiseOptions, MotionOptions {
  selector?: string;
  blendMode?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const encodeSvg = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

const canvasNoiseCacheLimit = 24;
const canvasNoiseCache = new Map<string, string>();

const getBrowserUserAgent = () => (typeof navigator === "undefined" ? "" : navigator.userAgent);

const motionPresets = new Set<MotionPreset>(["none", "drift", "breathe", "orbit"]);

const normalizeSwirl = (swirl = 0) => {
  const value = clamp(swirl, 0, 100);
  const shift = value / 100;
  return {
    value,
    enabled: value > 0,
    scale: (1 + value * 0.004).toFixed(3),
    rotate: (value * 0.12).toFixed(2),
    offsetX: shift * 12,
    offsetY: shift * -10,
    backgroundSizeX: (100 + value * 0.55).toFixed(1),
    backgroundSizeY: (100 + value * 0.4).toFixed(1),
    backgroundPositionX: (50 + shift * 12).toFixed(1),
    backgroundPositionY: (50 - shift * 10).toFixed(1),
  };
};

const createSwirlTransform = (swirl: ReturnType<typeof normalizeSwirl>) =>
  swirl.enabled ? ` scale(${swirl.scale}) rotate(${swirl.rotate}deg)` : "";

const shiftedPosition = (x: number, y: number, swirl: ReturnType<typeof normalizeSwirl>) =>
  `${(x + swirl.offsetX).toFixed(1)}% ${(y + swirl.offsetY).toFixed(1)}%`;

const normalizeMotion = (options: MotionOptions = {}) => {
  const preset = motionPresets.has(options.motionPreset as MotionPreset)
    ? (options.motionPreset as MotionPreset)
    : "none";
  const speed = clamp(options.motionSpeed ?? 0, 0, 100);
  const intensity = clamp(options.motionIntensity ?? 50, 0, 100);
  const enabled = preset !== "none" && speed > 0 && intensity > 0;
  const duration = Math.round(56 - speed * 0.46);
  const travel = (4 + intensity * 0.16).toFixed(1);
  const zoom = (1.12 + intensity * 0.0018).toFixed(3);
  const rotate = (intensity * 0.12).toFixed(1);
  const grainShift = (2 + intensity * 0.08).toFixed(1);

  return {
    preset,
    enabled,
    duration: Math.max(10, duration),
    travel,
    zoom,
    rotate,
    grainShift,
  };
};

const canvasNoiseKey = (options: TurbulenceNoiseOptions = {}) => {
  const seed = Math.floor(clamp(options.seed ?? 1, 0, 9999));
  const frequency = clamp(options.frequency ?? options.baseFrequency ?? 1.25, 0.04, 2.4);
  const density = (frequency - 0.04) / (2.4 - 0.04);
  const blockSize = Math.max(1, Math.round(2.25 - density * 1.25));
  const contrast = clamp((options.contrast ?? 1.7) / 2.5, 0.35, 1).toFixed(3);
  return JSON.stringify([seed, blockSize, contrast]);
};

const cacheCanvasNoise = (key: string, url: string) => {
  if (canvasNoiseCache.has(key)) canvasNoiseCache.delete(key);
  canvasNoiseCache.set(key, url);
  while (canvasNoiseCache.size > canvasNoiseCacheLimit) {
    const oldestKey = canvasNoiseCache.keys().next().value;
    if (oldestKey === undefined) break;
    canvasNoiseCache.delete(oldestKey);
  }
};

export const isAndroidChrome = (userAgent = getBrowserUserAgent()) => {
  const ua = userAgent;
  return (
    /Android/i.test(ua) &&
    /Chrome\//i.test(ua) &&
    !/(; wv|Version\/|EdgA|OPR|SamsungBrowser|Firefox|CriOS)/i.test(ua)
  );
};

export const shouldUseAndroidCanvasFallback = (
  fallback: AndroidCanvasFallback | undefined,
  userAgent?: string | null,
) => {
  if (fallback === "on") return true;
  if (fallback === "off") return false;
  return isAndroidChrome(userAgent ?? getBrowserUserAgent());
};

export function createCanvasGrainNoise(options: TurbulenceNoiseOptions = {}): string | null {
  if (typeof document === "undefined") return null;

  const cacheKey = canvasNoiseKey(options);
  const cached = canvasNoiseCache.get(cacheKey);
  if (cached) {
    cacheCanvasNoise(cacheKey, cached);
    return cached;
  }

  try {
    const size = 1024;
    const canvas = document.createElement("canvas");
    if (typeof canvas.getContext !== "function" || typeof canvas.toDataURL !== "function") {
      return null;
    }
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context || typeof context.createImageData !== "function") return null;

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
    cacheCanvasNoise(cacheKey, url);
    return url;
  } catch {
    return null;
  }
}

export function createCanvasGrainBackgroundSize(options: TurbulenceNoiseOptions = {}) {
  const frequency = clamp(options.frequency ?? options.baseFrequency ?? 1.25, 0.04, 2.4);
  const density = (frequency - 0.04) / (2.4 - 0.04);
  return `${Math.round(720 - density * 580)}px ${Math.round(720 - density * 580)}px`;
}

export function createAndroidCanvasFallbackStyle(
  options: AndroidCanvasFallbackOptions = {},
): CanvasGrainStyle | null {
  if (
    !shouldUseAndroidCanvasFallback(
      options.androidCanvasFallback,
      options.androidCanvasFallbackUserAgent,
    )
  ) {
    return null;
  }

  const backgroundImage = createCanvasGrainNoise(options);
  if (!backgroundImage) return null;

  return {
    backgroundImage,
    backgroundSize: createCanvasGrainBackgroundSize(options),
    backgroundRepeat: "repeat",
    imageRendering: "pixelated",
  };
}

const keyframeName = (selector: string) =>
  `grain-gradient-${selector.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "motion"}`;

function createGrainGradientMotionCSS(options: GrainGradientCSSOptions = {}): string {
  const selector = options.selector ?? ".grain-gradient";
  const motion = normalizeMotion(options);
  const swirl = normalizeSwirl(options.swirl);
  const swirlTransform = createSwirlTransform(swirl);
  if (!motion.enabled) return "";

  const name = keyframeName(selector);
  const meshName = `${name}-mesh-${motion.preset}`;
  const meshAnimation = `${meshName} ${motion.duration}s ease-in-out infinite alternate`;

  const motionKeyframes: Record<Exclude<MotionPreset, "none">, string> = {
    drift: `@keyframes ${meshName} {\n  0% { transform: scale(1.12)${swirlTransform} translate3d(-${motion.travel}%, -${motion.travel}%, 0); }\n  100% { transform: scale(${motion.zoom})${swirlTransform} translate3d(${motion.travel}%, ${motion.travel}%, 0); }\n}`,
    breathe: `@keyframes ${meshName} {\n  0% { transform: scale(1.12)${swirlTransform}; filter: blur(${clamp(options.blur ?? 42, 0, 80)}px) saturate(${clamp(options.saturation ?? options.intensity ?? 1.18, 0.2, 2.5)}); }\n  100% { transform: scale(${motion.zoom})${swirlTransform}; filter: blur(${clamp((options.blur ?? 42) + Number(motion.travel), 0, 80)}px) saturate(${clamp((options.saturation ?? options.intensity ?? 1.18) + 0.18, 0.2, 2.5)}); }\n}`,
    orbit: `@keyframes ${meshName} {\n  0% { transform: scale(1.12)${swirlTransform} rotate(-${motion.rotate}deg) translate3d(-${motion.travel}%, ${motion.travel}%, 0); background-position: ${shiftedPosition(46, 54, swirl)}; }\n  100% { transform: scale(${motion.zoom})${swirlTransform} rotate(${motion.rotate}deg) translate3d(${motion.travel}%, -${motion.travel}%, 0); background-position: ${shiftedPosition(54, 46, swirl)}; }\n}`,
  };
  const keyframes = motionKeyframes[motion.preset as Exclude<MotionPreset, "none">];

  return `${selector}::before { animation: ${meshAnimation}; }\n\n${keyframes}\n\n@media (prefers-reduced-motion: reduce) {\n  ${selector}::before { animation: none; }\n}`;
}

export function createTurbulenceNoise(options: TurbulenceNoiseOptions = {}): string {
  const seed = Math.floor(clamp(options.seed ?? 1, 0, 9999));
  const baseFrequency = clamp(options.frequency ?? options.baseFrequency ?? 1.25, 0.04, 2.4);
  const numOctaves = Math.floor(clamp(options.numOctaves ?? 2, 1, 5));
  const stitchTiles = options.stitchTiles ?? true;
  const contrast = clamp(options.contrast ?? 1.7, 1.0, 2.5);
  const width = Math.floor(clamp(options.width ?? options.size ?? 3200, 256, 8192));
  const height = Math.floor(clamp(options.height ?? options.size ?? 2200, 256, 8192));
  const offset = ((1 - contrast) / 2).toFixed(3);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="${baseFrequency}" numOctaves="${numOctaves}" seed="${seed}" stitchTiles="${stitchTiles ? "stitch" : "noStitch"}" /><feColorMatrix type="matrix" values="${contrast} 0 0 0 ${offset} 0 ${contrast} 0 0 ${offset} 0 0 ${contrast} 0 ${offset} 0 0 0 1 0" /><feComponentTransfer><feFuncR type="discrete" tableValues="0 1" /><feFuncG type="discrete" tableValues="0 1" /><feFuncB type="discrete" tableValues="0 1" /></feComponentTransfer></filter><rect width="100%" height="100%" filter="url(#n)" /></svg>`;

  return encodeSvg(svg);
}

export function createMeshGradient(options: MeshGradientOptions = {}): string {
  const colors = options.colors?.length
    ? options.colors
    : ["#7c3aed", "#06b6d4", "#f97316", "#f43f5e"];
  const baseColor = options.baseColor ?? "#0b1020";
  const stops = colors.slice(0, 6);
  const positions = ["12% 18%", "86% 16%", "70% 82%", "20% 88%", "50% 46%", "18% 56%"];
  const sizes = [34, 32, 36, 32, 30, 28];
  const layers = stops.map((color, index) => {
    const pos = positions[index] ?? positions[positions.length - 1];
    const size = sizes[index] ?? sizes[sizes.length - 1];
    return `radial-gradient(circle at ${pos}, ${color} 0, transparent ${size}%)`;
  });
  return `${layers.join(", ")}, linear-gradient(135deg, ${stops.join(", ")}, ${baseColor})`;
}

export function createGrainGradientCSS(options: GrainGradientCSSOptions = {}): string {
  const selector = options.selector ?? ".grain-gradient";
  const motionCSS = createGrainGradientMotionCSS(options);
  const swirl = normalizeSwirl(options.swirl);
  const swirlBackgroundPosition = swirl.enabled
    ? `  background-position: ${swirl.backgroundPositionX}% ${swirl.backgroundPositionY}%;\n`
    : "";
  const swirlTransform = createSwirlTransform(swirl);
  return `
${selector} {
  position: relative;
  overflow: hidden;
  background-color: ${options.baseColor ?? "#0b1020"};
}

${selector}::before {
  content: "";
  position: absolute;
  inset: -18%;
  background-image: ${createMeshGradient(options)};
  background-size: ${swirl.enabled ? `${swirl.backgroundSizeX}% ${swirl.backgroundSizeY}%` : "100% 100%"};
${swirlBackgroundPosition}  background-repeat: no-repeat;
  filter: blur(${clamp(options.blur ?? 42, 0, 80)}px) saturate(${clamp(options.saturation ?? options.intensity ?? 1.18, 0.2, 2.5)});
  transform: scale(1.12)${swirlTransform};
  transform-origin: 50% 50%;
  backface-visibility: hidden;
  will-change: transform;
  z-index: 0;
}

${selector}::after {
  content: "";
  position: absolute;
  inset: -8%;
  pointer-events: none;
  background-image: ${createTurbulenceNoise(options)};
  background-size: 100% 100%;
  background-repeat: no-repeat;
  opacity: ${clamp(options.opacity ?? 0.34, 0, 1)};
  mix-blend-mode: ${options.blendMode ?? "overlay"};
  z-index: 1;
}

${motionCSS}`.trim();
}

export const presets = {
  "Aurora Citrus": { colors: ["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"], baseColor: "#0f1020" },
  "Blue Hour": { colors: ["#0f172a", "#2563eb", "#38bdf8", "#f8fafc"], baseColor: "#0f172a" },
  "Candy Fog": { colors: ["#ff70a6", "#ff9770", "#ffd670", "#70d6ff"], baseColor: "#1f1020" },
  "Forest Glass": { colors: ["#064e3b", "#10b981", "#bef264", "#fef3c7"], baseColor: "#064e3b" },
  "Midnight Bloom": { colors: ["#111827", "#7c3aed", "#ec4899", "#fdf2f8"], baseColor: "#111827" },
} as const;

export type GrainGradientPreset = (typeof presets)[keyof typeof presets];
