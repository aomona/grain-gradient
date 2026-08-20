# API reference

`grain-gradient` provides a WebGL shader renderer and optional React helpers. Both the mesh gradient and the grain texture are generated in the fragment shader.

> **v2 is WebGL-only.** CSS/SVG gradient generation APIs from v1 were removed, including `createGrainGradientCSS`, `createMeshGradient`, `createTurbulenceNoise`, `createAndroidCanvasFallbackStyle`, and related Android/canvas fallback helpers. The React component falls back to a plain `baseColor` background when WebGL is unavailable or the WebGL context is lost.

## Import paths

```ts
import {
  createWebGLMeshRenderer,
  isWebGLAvailable,
  presets,
  resolveWebGLMeshGradientOptions,
} from "grain-gradient";
```

```tsx
import { GrainGradient, useGrainGradient } from "grain-gradient/react";
```

Compatibility subpaths are still available:

```ts
import { createWebGLMeshRenderer } from "grain-gradient/webgl";
import { WebGLGrainGradient } from "grain-gradient/webgl/react";
```

## `createWebGLMeshRenderer(canvas, options?)`

Creates a WebGL renderer for an existing `<canvas>`.

```ts
const renderer = createWebGLMeshRenderer(canvas, {
  colors: ["#c2e812", "#ff7f11", "#ee4266", "#2a1e5c"],
  baseColor: "#0f1020",
  motionPreset: "drift",
  motionSpeed: 38,
  motionIntensity: 46,
  swirl: 30,
  opacity: 0.22,
});

renderer?.start();
```

Returns `null` if WebGL is unavailable or shader setup fails.

### Renderer methods

- `start()`: start rendering. Static gradients render once; animated gradients render on `requestAnimationFrame`.
- `stop()`: stop the animation loop.
- `update(options)`: merge and apply new options.
- `replaceOptions(options)`: replace all options; omitted values return to their defaults.
- `resize()`: sync the canvas backing size and viewport with the rendered element size.
- `destroy()`: stop rendering and release WebGL resources.

## `resolveWebGLMeshGradientOptions(options?)`

Normalizes renderer options and clamps performance-sensitive values. This function is safe to call without browser globals.

## `isWebGLAvailable()`

Returns `false` on the server and otherwise checks whether a WebGL context can be created.

## React

### `<GrainGradient />`

Client-side WebGL component. When WebGL is unavailable or the WebGL context is lost, the component renders only the `baseColor` background; no CSS/SVG or 2D canvas fallback is provided.

```tsx
import { GrainGradient, presets } from "grain-gradient/react";

<GrainGradient
  {...presets["Blue Hour"]}
  motionPreset="orbit"
  motionSpeed={35}
  motionIntensity={45}
  style={{ minHeight: 360 }}
/>;
```

Props include all renderer options plus:

- `className?: string`
- `style?: React.CSSProperties`
- `canvasStyle?: React.CSSProperties`
- `children?: React.ReactNode`

### `useGrainGradient(options?)`

Returns minimal `rootStyle` and `canvasStyle` objects used by the component. It does not create a renderer.

## Options

### Mesh options

- `colors?: string[]` — up to six colors. Fewer colors are repeated to fill shader uniforms.
- `baseColor?: string` — fallback background color and shader base color. Default: `"#0b1020"`.
- `intensity?: number` — alias for default saturation when `saturation` is omitted.
- `saturation?: number` — clamped `0.2` to `2.5`. Default: `1.18`.
- `swirl?: number` — clamped `0` to `100`.

### Grain options

- `opacity?: number` — shader grain amount, clamped `0` to `1`. Default: `0.2`.
- `frequency?: number` / `baseFrequency?: number` — grain density, clamped `0.04` to `2.4`. Default: `1.25`.
- `contrast?: number` — grain contrast, clamped `1` to `2.5`. Default: `1.7`.
- `seed?: number` — integer seed, clamped `0` to `9999`. Default: `1`.

### Motion options

- `motionPreset?: "none" | "drift" | "breathe" | "orbit"`. Default: `"none"`.
- `motionSpeed?: number` — clamped `0` to `100`. Motion is disabled when `0`.
- `motionIntensity?: number` — clamped `0` to `100`. Default: `50`.

### WebGL/performance options

- `maxPixelRatio?: number` — static render pixel-ratio cap, clamped `0.5` to `3`. Default: `1.25`.
- `motionMaxPixelRatio?: number` — animated render pixel-ratio cap, clamped `0.5` to `3`. Default: `min(maxPixelRatio, 0.75)`.
- `fps?: number` — animation frame cap, clamped `1` to `60`. Default: `30`.
- `pauseWhenHidden?: boolean` — skips animated draws while `document.hidden`. Default: `true`.

## Presets

- `Aurora Citrus`
- `Blue Hour`
- `Candy Fog`
- `Forest Glass`
- `Midnight Bloom`
