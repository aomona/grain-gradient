export type GrainGradientPresetName =
  | "Aurora Citrus"
  | "Blue Hour"
  | "Candy Fog"
  | "Forest Glass"
  | "Midnight Bloom";

export interface MeshGradientOptions {
  colors?: string[];
  baseColor?: string;
  intensity?: number;
  saturation?: number;
  swirl?: number;
}

export type MotionPreset = "none" | "drift" | "breathe" | "orbit";

export interface MotionOptions {
  motionPreset?: MotionPreset;
  motionSpeed?: number;
  motionIntensity?: number;
}

export interface GrainOptions {
  seed?: number;
  frequency?: number;
  baseFrequency?: number;
  contrast?: number;
  opacity?: number;
}

export interface GrainGradientOptions extends MeshGradientOptions, MotionOptions, GrainOptions {}

export const presets = {
  "Aurora Citrus": { colors: ["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"], baseColor: "#0f1020" },
  "Blue Hour": { colors: ["#0f172a", "#2563eb", "#38bdf8", "#f8fafc"], baseColor: "#0f172a" },
  "Candy Fog": { colors: ["#ff70a6", "#ff9770", "#ffd670", "#70d6ff"], baseColor: "#1f1020" },
  "Forest Glass": { colors: ["#064e3b", "#10b981", "#bef264", "#fef3c7"], baseColor: "#064e3b" },
  "Midnight Bloom": { colors: ["#111827", "#7c3aed", "#ec4899", "#fdf2f8"], baseColor: "#111827" },
} as const;

export type GrainGradientPreset = (typeof presets)[keyof typeof presets];
