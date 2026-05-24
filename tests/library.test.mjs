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

test("keeps swirl neutral by default", () => {
  const css = createGrainGradientCSS();
  assert.ok(!css.includes("background-position:"));
  assert.ok(!css.includes("rotate("));
  assert.ok(!css.includes("scale(1.12) translate3d"));
});

test("adds swirl mesh transforms when enabled", () => {
  const css = createGrainGradientCSS({ swirl: 50 });
  assert.ok(css.includes("background-size: 127.5% 120.0%"));
  assert.ok(css.includes("background-position: 56.0% 45.0%"));
  assert.ok(css.includes("transform:"));
  assert.ok(css.includes("scale(1.200)"));
  assert.ok(css.includes("rotate(6.00deg)"));
});

test("clamps swirl above 100", () => {
  const css = createGrainGradientCSS({ swirl: 999 });
  assert.ok(css.includes("background-size: 155.0% 140.0%"));
  assert.ok(css.includes("background-position: 62.0% 40.0%"));
  assert.ok(css.includes("scale(1.400)"));
  assert.ok(css.includes("rotate(12.00deg)"));
});

test("clamps swirl below 0", () => {
  const css = createGrainGradientCSS({ swirl: -20 });
  assert.ok(!css.includes("background-position:"));
  assert.ok(!css.includes("rotate("));
  assert.ok(!css.includes("scale(1.12) translate3d"));
});

test("keeps swirl offsets in motion keyframes", () => {
  const css = createGrainGradientCSS({ swirl: 50, motionPreset: "drift", motionSpeed: 40 });
  assert.ok(css.includes("background-position: 48.0% 43.0%"));
  assert.ok(css.includes("background-position: 64.0% 47.0%"));
  assert.ok(css.includes("scale(1.200) rotate(6.00deg) translate3d"));
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
