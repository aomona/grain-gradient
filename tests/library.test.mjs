import test from "node:test";
import assert from "node:assert/strict";

import {
  createGrainGradientCSS,
  createMeshGradient,
  createTurbulenceNoise,
  presets,
} from "../dist/index.js";

test("exports presets", () => {
  assert.equal(Object.keys(presets).length, 5);
  for (const preset of Object.values(presets)) assert.equal(preset.colors.length, 4);
  assert.deepEqual(presets["Aurora Citrus"].colors, ["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"]);
});

test("creates svg noise url", () => {
  const noise = createTurbulenceNoise();
  assert.ok(noise.startsWith('url("data:image/svg+xml,'));
  assert.ok(noise.includes("feTurbulence"));
});

test("creates mesh gradient string", () => {
  const mesh = createMeshGradient();
  assert.ok(mesh.includes("radial-gradient"));
  assert.ok(!mesh.includes("background-image:"));
  assert.ok(!mesh.includes("color-mix"));
  assert.ok(mesh.includes("linear-gradient"));
});

test("creates css snippet", () => {
  const css = createGrainGradientCSS();
  assert.ok(css.includes("::before"));
  assert.ok(css.includes("::after"));
  assert.ok(css.includes("pointer-events: none"));
  assert.ok(css.includes("mix-blend-mode: overlay"));
  assert.ok(css.includes("inset: -18%"));
  assert.ok(css.includes("inset: -8%"));
});

test("creates animated css when motion is enabled", () => {
  const css = createGrainGradientCSS({
    motionPreset: "drift",
    motionSpeed: 40,
    motionIntensity: 50,
  });
  assert.ok(css.includes("animation:"));
  assert.ok(css.includes("@keyframes"));
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(css.includes("grain-gradient-grain-gradient-mesh-drift"));
  assert.ok(!css.includes("grain-gradient-grain-gradient-grain-drift"));
});

test("does not create motion keyframes when speed is zero", () => {
  const css = createGrainGradientCSS({ motionPreset: "drift", motionSpeed: 0 });
  assert.ok(!css.includes("@keyframes"));
});

test("ignores invalid motion preset values", () => {
  const css = createGrainGradientCSS({ motionPreset: "invalid", motionSpeed: 40 });
  assert.ok(!css.includes("undefined"));
  assert.ok(!css.includes("@keyframes"));
});

test("creates svg noise with expected defaults", () => {
  const noise = createTurbulenceNoise();
  const decoded = decodeURIComponent(noise.slice('url("data:image/svg+xml,'.length, -2));
  assert.ok(decoded.includes('baseFrequency="1.25"'));
  assert.ok(decoded.includes('width="3200"'));
  assert.ok(decoded.includes('height="2200"'));
  assert.ok(decoded.includes("feColorMatrix"));
});

test("allows lower svg grain frequency for density controls", () => {
  const noise = createTurbulenceNoise({ frequency: 0.04 });
  const decoded = decodeURIComponent(noise.slice('url("data:image/svg+xml,'.length, -2));
  assert.ok(decoded.includes('baseFrequency="0.04"'));
});
