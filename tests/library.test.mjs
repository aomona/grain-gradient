import test from 'node:test';
import assert from 'node:assert/strict';

import { createGrainGradientCSS, createMeshGradient, createTurbulenceNoise, presets } from '../dist/index.js';

test('exports presets', () => {
  assert.equal(Object.keys(presets).length, 5);
  for (const preset of Object.values(presets)) assert.equal(preset.colors.length, 4);
  assert.deepEqual(presets['Aurora Citrus'].colors, ['#c2e812', '#ff7f11', '#ee4266', '#2a1e5c']);
});

test('creates svg noise url', () => {
  const noise = createTurbulenceNoise();
  assert.ok(noise.startsWith('url("data:image/svg+xml,'));
  assert.ok(noise.includes('feTurbulence'));
});

test('creates mesh gradient string', () => {
  const mesh = createMeshGradient();
  assert.ok(mesh.includes('radial-gradient'));
  assert.ok(!mesh.includes('background-image:'));
  assert.ok(!mesh.includes('color-mix'));
  assert.ok(mesh.includes('linear-gradient'));
});

test('creates css snippet', () => {
  const css = createGrainGradientCSS();
  assert.ok(css.includes('::before'));
  assert.ok(css.includes('::after'));
  assert.ok(css.includes('pointer-events: none'));
  assert.ok(css.includes('mix-blend-mode: overlay'));
});

test('creates svg noise with expected defaults', () => {
  const noise = createTurbulenceNoise();
  const decoded = decodeURIComponent(noise.slice('url("data:image/svg+xml,'.length, -2));
  assert.ok(decoded.includes('baseFrequency="1.25"'));
  assert.ok(decoded.includes('width="3200"'));
  assert.ok(decoded.includes('height="2200"'));
  assert.ok(decoded.includes('feColorMatrix'));
});

test('creates android chrome safe turbulence noise', () => {
  const noise = createTurbulenceNoise({ androidChromeFix: true });
  const decoded = decodeURIComponent(noise.slice('url("data:image/svg+xml,'.length, -2));

  assert.ok(decoded.includes('width="1024"'));
  assert.ok(decoded.includes('height="1024"'));
  assert.ok(decoded.includes('baseFrequency="0.85"'));
  assert.ok(decoded.includes('numOctaves="1"'));
  assert.ok(decoded.includes('values="1.45 0 0 0 -0.225'));
  assert.ok(decoded.includes('type="table"'));
  assert.ok(!decoded.includes('type="discrete"'));
});

test('auto android chrome fix follows browser user agent', () => {
  const originalNavigator = globalThis.navigator;
  const setUserAgent = (userAgent) => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { userAgent },
    });
  };

  try {
    setUserAgent('Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36');
    let decoded = decodeURIComponent(createTurbulenceNoise().slice('url("data:image/svg+xml,'.length, -2));
    assert.ok(decoded.includes('width="1024"'));
    assert.ok(decoded.includes('type="table"'));

    decoded = decodeURIComponent(createTurbulenceNoise({ androidChromeFix: false }).slice('url("data:image/svg+xml,'.length, -2));
    assert.ok(decoded.includes('width="3200"'));
    assert.ok(decoded.includes('type="discrete"'));

    setUserAgent('Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/125.0.0.0 Mobile Safari/537.36');
    decoded = decodeURIComponent(createTurbulenceNoise().slice('url("data:image/svg+xml,'.length, -2));
    assert.ok(decoded.includes('width="3200"'));
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  }
});
