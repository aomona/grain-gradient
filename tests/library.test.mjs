import test from "node:test";
import assert from "node:assert/strict";

import {
  createAndroidCanvasFallbackStyle,
  createCanvasGrainBackgroundSize,
  createCanvasGrainNoise,
  createGrainGradientCSS,
  createGrainLayerStyle,
  createMeshGradient,
  createTurbulenceNoise,
  isAndroidChrome,
  presets,
  shouldUseAndroidCanvasFallback,
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
  assert.ok(css.includes("background-size: 3200px 2200px"));
  assert.ok(css.includes("background-repeat: repeat"));
  assert.equal(css.match(/contain: paint/g)?.length, 1);
  assert.ok(!css.includes("will-change: transform"));
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

test("keeps swirl offsets in orbit keyframes", () => {
  const css = createGrainGradientCSS({ swirl: 50, motionPreset: "orbit", motionSpeed: 40 });
  assert.ok(css.includes("background-position: 52.0% 49.0%"));
  assert.ok(css.includes("background-position: 60.0% 41.0%"));
  assert.ok(css.includes("scale(1.200) rotate(6.00deg) rotate("));
});

test("keeps drift animation transform-only", () => {
  const css = createGrainGradientCSS({ motionPreset: "drift", motionSpeed: 40 });
  assert.ok(!css.includes("background-position:"));
  assert.ok(css.includes("translate3d"));
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
  assert.ok(css.includes("will-change: transform"));
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
  assert.ok(decoded.includes('filterUnits="userSpaceOnUse"'));
  assert.ok(decoded.includes("feColorMatrix"));
});

test("allows lower svg grain frequency for density controls", () => {
  const noise = createTurbulenceNoise({ frequency: 0.04 });
  const decoded = decodeURIComponent(noise.slice('url("data:image/svg+xml,'.length, -2));
  assert.ok(decoded.includes('baseFrequency="0.04"'));
});

test("detects Android Chrome for canvas fallback", () => {
  const androidChrome =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
  const excludedBrowsers = [
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 EdgA/124.0.0.0",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 OPR/80.0.0.0",
    "Mozilla/5.0 (Android 14; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0",
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/120.0 Mobile Safari/537.36",
  ];

  assert.equal(isAndroidChrome(androidChrome), true);
  for (const userAgent of excludedBrowsers) assert.equal(isAndroidChrome(userAgent), false);
  assert.equal(shouldUseAndroidCanvasFallback("auto", androidChrome), true);
  assert.equal(shouldUseAndroidCanvasFallback("off", androidChrome), false);
  assert.equal(shouldUseAndroidCanvasFallback("on", excludedBrowsers[0]), true);
});

test("exposes framework agnostic canvas fallback helpers", () => {
  assert.equal(createCanvasGrainBackgroundSize({ frequency: 0.04 }), "720px 720px");
  assert.equal(createCanvasGrainBackgroundSize({ frequency: 2.4 }), "140px 140px");
  assert.deepEqual(createGrainLayerStyle(), {
    backgroundSize: "3200px 2200px",
    backgroundRepeat: "repeat",
  });
  assert.deepEqual(createGrainLayerStyle({ size: 512 }), {
    backgroundSize: "512px 512px",
    backgroundRepeat: "repeat",
  });
  assert.equal(createCanvasGrainNoise(), null);
  assert.equal(createAndroidCanvasFallbackStyle({ androidCanvasFallback: "on" }), null);
});

test("creates canvas fallback style when canvas is available", () => {
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement(name) {
      assert.equal(name, "canvas");
      return {
        width: 0,
        height: 0,
        getContext(type) {
          assert.equal(type, "2d");
          return {
            createImageData(width, height) {
              return { data: new Uint8ClampedArray(width * height * 4) };
            },
            putImageData() {},
          };
        },
        toDataURL(type) {
          assert.equal(type, "image/png");
          return "data:image/png;base64,test";
        },
      };
    },
  };

  try {
    const style = createAndroidCanvasFallbackStyle({
      androidCanvasFallback: "on",
      seed: 7,
      frequency: 1.25,
      contrast: 1.7,
    });
    assert.deepEqual(style, {
      backgroundImage: 'url("data:image/png;base64,test")',
      backgroundSize: "423px 423px",
      backgroundRepeat: "repeat",
      imageRendering: "pixelated",
    });
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
