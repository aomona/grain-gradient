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

export interface MeshGradientOptions {
  colors?: string[];
  baseColor?: string;
  intensity?: number;
  blur?: number;
  saturation?: number;
}

export interface GrainGradientCSSOptions extends MeshGradientOptions, TurbulenceNoiseOptions {
  selector?: string;
  blendMode?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const encodeSvg = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

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
  const colors = options.colors?.length ? options.colors : ["#7c3aed", "#06b6d4", "#f97316", "#f43f5e"];
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
  return `
${selector} {
  position: relative;
  overflow: hidden;
  background-color: ${options.baseColor ?? "#0b1020"};
}

${selector}::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: ${createMeshGradient(options)};
  background-size: 100% 100%;
  background-repeat: no-repeat;
  filter: blur(${clamp(options.blur ?? 42, 0, 80)}px) saturate(${clamp(options.saturation ?? options.intensity ?? 1.18, 0.2, 2.5)});
  transform: scale(1.12);
  z-index: 0;
}

${selector}::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: ${createTurbulenceNoise(options)};
  background-size: 100% 100%;
  background-repeat: no-repeat;
  opacity: ${clamp(options.opacity ?? 0.34, 0, 1)};
  mix-blend-mode: ${options.blendMode ?? "overlay"};
  z-index: 1;
}`.trim();
}

export const presets = {
  "Aurora Citrus": { colors: ["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"], baseColor: "#0f1020" },
  "Blue Hour": { colors: ["#0f172a", "#2563eb", "#38bdf8", "#f8fafc"], baseColor: "#0f172a" },
  "Candy Fog": { colors: ["#ff70a6", "#ff9770", "#ffd670", "#70d6ff"], baseColor: "#1f1020" },
  "Forest Glass": { colors: ["#064e3b", "#10b981", "#bef264", "#fef3c7"], baseColor: "#064e3b" },
  "Midnight Bloom": { colors: ["#111827", "#7c3aed", "#ec4899", "#fdf2f8"], baseColor: "#111827" }
} as const;

export type GrainGradientPreset = (typeof presets)[keyof typeof presets];
