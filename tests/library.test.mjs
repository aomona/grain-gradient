import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as api from "../dist/index.js";
import { isWebGLAvailable, resolveWebGLMeshGradientOptions } from "../dist/webgl.js";

const { presets } = api;

test("exports presets", () => {
  assert.equal(Object.keys(presets).length, 5);
  for (const preset of Object.values(presets)) assert.equal(preset.colors.length, 4);
  assert.deepEqual(presets["Aurora Citrus"].colors, ["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"]);
});

test("main entry exports the WebGL shader API", () => {
  assert.equal(typeof api.createWebGLMeshRenderer, "function");
  assert.equal(typeof api.resolveWebGLMeshGradientOptions, "function");
  assert.equal(typeof api.isWebGLAvailable, "function");
});

test("removed CSS/SVG and canvas fallback exports are absent", () => {
  assert.equal(api.createGrainGradientCSS, undefined);
  assert.equal(api.createMeshGradient, undefined);
  assert.equal(api.createTurbulenceNoise, undefined);
  assert.equal(api.createAndroidCanvasFallbackStyle, undefined);
  assert.equal(api.createCanvasGrainNoise, undefined);
  assert.equal(api.createCanvasGrainBackgroundSize, undefined);
  assert.equal(api.createGrainLayerStyle, undefined);
  assert.equal(api.isAndroidChrome, undefined);
  assert.equal(api.shouldUseAndroidCanvasFallback, undefined);
});

test("resolves webgl shader options without browser globals", () => {
  assert.equal(isWebGLAvailable(), false);
  const options = resolveWebGLMeshGradientOptions({
    colors: ["#000", "#fff"],
    maxPixelRatio: 10,
    fps: 120,
    motionSpeed: 40,
    seed: 7,
    frequency: 2.4,
    contrast: 3,
    opacity: 2,
  });
  assert.equal(options.colors.length, 6);
  assert.deepEqual(options.colors.slice(0, 4), ["#000", "#fff", "#fff", "#fff"]);
  assert.equal(options.colorCount, 2);
  assert.equal(options.maxPixelRatio, 3);
  assert.equal(options.motionMaxPixelRatio, 0.75);
  assert.equal(options.fps, 60);
  assert.equal(options.motionSpeed, 40);
  assert.equal(options.grainSeed, resolveWebGLMeshGradientOptions({ seed: 7 }).grainSeed);
  assert.ok(
    options.grainSeed >= 0 && options.grainSeed < 1,
    "grainSeed should be normalized to a shader-safe range",
  );
  assert.equal(options.grainScale, 1248);
  assert.equal(options.grainContrast, 2.5);
  assert.equal(options.grainOpacity, 1);
});

test("resolves grain shader defaults", () => {
  const options = resolveWebGLMeshGradientOptions();
  assert.equal(options.baseColor, "#0b1020");
  assert.equal(options.saturation, 1.18);
  assert.equal(options.grainOpacity, 0.2);
  assert.equal(options.grainScale, 650);
  assert.equal(options.grainContrast, 1.7);
  assert.equal(options.grainSeed, resolveWebGLMeshGradientOptions({ seed: 1 }).grainSeed);
});

test("normalizes seed to a shader-safe range", () => {
  const low = resolveWebGLMeshGradientOptions({ seed: 0 });
  const high = resolveWebGLMeshGradientOptions({ seed: 9999 });
  assert.ok(low.grainSeed >= 0 && low.grainSeed < 1, "grainSeed should be in [0, 1)");
  assert.ok(high.grainSeed >= 0 && high.grainSeed < 1, "grainSeed should be in [0, 1)");
  assert.notEqual(
    low.grainSeed,
    high.grainSeed,
    "different seeds should produce different grainSeed values",
  );

  const seeds = [0, 1, 42, 100, 1234, 5000, 9999];
  const values = new Set(seeds.map((seed) => resolveWebGLMeshGradientOptions({ seed }).grainSeed));
  assert.equal(
    values.size,
    seeds.length,
    "sampled seeds should remain distinct after normalization",
  );

  assert.equal(
    resolveWebGLMeshGradientOptions({ seed: 1234 }).grainSeed,
    resolveWebGLMeshGradientOptions({ seed: 1234 }).grainSeed,
    "normalization should be deterministic",
  );
});

test("grain coordinates use scalar resolution normalization", () => {
  const source = readFileSync(new URL("../dist/webgl.js", import.meta.url), "utf8");
  assert.ok(source.includes("grain("), "fragment shader should call grain()");
  assert.ok(
    !source.includes("gl_FragCoord.xy / max(u_resolution.xy, vec2(1.0))"),
    "grain should not normalize x and y separately by resolution",
  );
  assert.ok(
    source.includes("gl_FragCoord.xy / max(min(u_resolution.x, u_resolution.y), 1.0)"),
    "grain should use scalar min-axis normalization to keep cells square",
  );
});

test("motion trig is computed on CPU and passed as uniforms", () => {
  const source = readFileSync(new URL("../dist/webgl.js", import.meta.url), "utf8");
  assert.ok(
    !source.includes("sin(u_time"),
    "fragment shader should not call sin(u_time) per pixel",
  );
  assert.ok(
    !source.includes("cos(u_time"),
    "fragment shader should not call cos(u_time) per pixel",
  );
  assert.ok(
    !source.includes("float s = sin("),
    "fragment shader should not compute sin per pixel in rotate2d",
  );
  assert.ok(
    !source.includes("float c = cos("),
    "fragment shader should not compute cos per pixel in rotate2d",
  );
  assert.ok(source.includes("u_frameRotationSin"), "frame rotation sin uniform should exist");
  assert.ok(source.includes("u_frameRotationCos"), "frame rotation cos uniform should exist");
  assert.ok(source.includes("u_frameScale"), "frame scale uniform should exist");
  assert.ok(source.includes("u_frameTravel"), "frame travel uniform should exist");
});

test("resolves invalid motionPreset to none", () => {
  const options = resolveWebGLMeshGradientOptions({ motionPreset: "invalid" });
  assert.equal(options.motionPreset, "none");
});

test("resolves color counts up to six and repeats the last stop", () => {
  const options = resolveWebGLMeshGradientOptions({
    colors: ["#ff0000"],
  });
  assert.equal(options.colorCount, 1);
  assert.equal(options.colors[0], "#ff0000");
  assert.equal(options.colors[5], "#ff0000");
});

test("react entry exports the WebGL component and hooks", async () => {
  const react = await import("../dist/react.js");
  assert.notEqual(react.GrainGradient, undefined);
  assert.equal(typeof react.useGrainGradient, "function");
  assert.equal(typeof react.createWebGLMeshRenderer, "function");
  assert.equal(typeof react.resolveWebGLMeshGradientOptions, "function");
});

test("webgl/react compatibility entry exports the same API", async () => {
  const webglReact = await import("../dist/webgl-react.js");
  assert.notEqual(webglReact.WebGLGrainGradient, undefined);
  assert.equal(typeof webglReact.useGrainGradient, "function");
  assert.equal(typeof webglReact.createWebGLMeshRenderer, "function");
  assert.equal(typeof webglReact.resolveWebGLMeshGradientOptions, "function");
});
