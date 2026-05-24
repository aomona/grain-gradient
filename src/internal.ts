export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export type MotionPreset = "none" | "drift" | "breathe" | "orbit";

export const normalizeSwirl = (swirl = 0) => {
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

export const createSwirlTransform = (swirl: ReturnType<typeof normalizeSwirl>) =>
  swirl.enabled ? ` scale(${swirl.scale}) rotate(${swirl.rotate}deg)` : "";

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
