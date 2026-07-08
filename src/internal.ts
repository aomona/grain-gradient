import type { MotionPreset } from "./core.js";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const normalizeSwirl = (swirl = 0) => {
  const value = clamp(swirl, 0, 100);
  return { value, enabled: value > 0 };
};

export const motionPresets = new Set<MotionPreset>(["none", "drift", "breathe", "orbit"]);

export const normalizeMotion = (
  options: {
    motionPreset?: MotionPreset;
    motionSpeed?: number;
    motionIntensity?: number;
  } = {},
) => {
  const preset = motionPresets.has(options.motionPreset ?? "none")
    ? (options.motionPreset ?? "none")
    : "none";
  const speed = clamp(options.motionSpeed ?? 0, 0, 100);
  const intensity = clamp(options.motionIntensity ?? 50, 0, 100);
  const enabled = preset !== "none" && speed > 0 && intensity > 0;
  const duration = Math.round(56 - speed * 0.46);
  const travel = (4 + intensity * 0.16).toFixed(1);
  const zoom = (1.12 + intensity * 0.0018).toFixed(3);
  const rotate = (intensity * 0.12).toFixed(1);

  return {
    preset,
    enabled,
    duration: Math.max(10, duration),
    travel,
    zoom,
    rotate,
  };
};
